import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../../services/chatService';
import { socketClient } from '../../services/socketClient';
import { signalStoreAdapter } from '../../lib/signal/SignalStoreAdapter';
import { uploadKeysIfNeeded } from '../../lib/signal/initWasm';
import {
    generateProvisioningKeyPair,
    deriveSharedKey,
    encryptPayload,
    decryptPayload
} from '../../lib/signal/provisioning';
import { uint8ArrayToBase64, base64ToUint8Array } from '../../lib/signal/signalUtils';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../Shared/ConfirmationModal';

export default function LinkedDevices() {
    const [devices, setDevices] = useState([]);
    const [currentDeviceId, setCurrentDeviceId] = useState(null);
    const [isPrimary, setIsPrimary] = useState(false);
    const [loading, setLoading] = useState(true);
    const [linkingCode, setLinkingCode] = useState('');
    const [pastedCode, setPastedCode] = useState('');
    const [provisioningStatus, setProvisioningStatus] = useState('');
    const [showRecoveryForm, setShowRecoveryForm] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [recoveryStatus, setRecoveryStatus] = useState('');

    const [isWiped, setIsWiped] = useState(false);

    // Ephemeral private key held in state for provisioning
    const [ephemeralPrivateKey, setEphemeralPrivateKey] = useState(null);

    const { showToast } = useToast();
    const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
    const [targetUnlinkId, setTargetUnlinkId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const devId = await signalStoreAdapter.getDeviceId();
            setCurrentDeviceId(devId);

            const primary = await signalStoreAdapter.isPrimaryDevice();
            setIsPrimary(primary);

            // If the user has a device ID, load list of devices
            if (devId) {
                const list = await chatService.listDevices();
                setDevices(list);
            }

            // Check if identity key exists
            const identityBytes = await signalStoreAdapter.getIdentityKeyPair();
            setIsWiped(!identityBytes);
        } catch (err) {
            console.error('Failed to load devices data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ─── Ephemeral Pairing Listener (For Secondary/Unlinked Device) ────
    useEffect(() => {
        if (!currentDeviceId || !isWiped) return;

        // Make sure socket is connected
        socketClient.connect();

        const unsub = socketClient.on('provision:data', async (payload) => {
            try {
                setProvisioningStatus('Relaying provisioning data... Deriving key...');
                if (!ephemeralPrivateKey) {
                    throw new Error('Ephemeral private key is missing. Regenerate the code.');
                }

                // Derive key
                const aesKey = await deriveSharedKey(ephemeralPrivateKey, payload.ephemeralPublicKey);

                setProvisioningStatus('Decrypting secure credentials...');
                // Decrypt credentials and history
                const decrypted = await decryptPayload(aesKey, payload.encryptedPayload);

                setProvisioningStatus('Restoring cryptographic identity...');
                // Save identity
                const identityKeyBytes = base64ToUint8Array(decrypted.identityKey);
                await signalStoreAdapter.initIdentity(identityKeyBytes, decrypted.registrationId);

                setProvisioningStatus('Restoring local message history...');
                // Save history
                if (decrypted.messagesHistory && decrypted.messagesHistory.length > 0) {
                    await signalStoreAdapter.saveLocalMessagesBatch(decrypted.messagesHistory);
                }

                setProvisioningStatus('Uploading device pre-keys...');
                // Run key generation & upload for this device
                await uploadKeysIfNeeded();

                setProvisioningStatus('Success! Linking complete. Reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                console.error('Failed to link device:', err);
                setProvisioningStatus('Error: ' + err.message);
            }
        });

        return unsub;
    }, [currentDeviceId, isWiped, ephemeralPrivateKey]);

    // ─── Generate Ephemeral Code for Scanning ──────────────────────────
    const handleGeneratePairingCode = async () => {
        try {
            setProvisioningStatus('Generating ephemeral pairing keypair...');
            const { privateKey, publicKeyBase64 } = await generateProvisioningKeyPair();
            setEphemeralPrivateKey(privateKey);

            // Structuring the pairing code payload
            const rawCode = JSON.stringify({
                deviceId: currentDeviceId,
                pubKey: publicKeyBase64
            });

            // Convert to Base64 linking code
            const base64Code = window.btoa(rawCode);
            setLinkingCode(base64Code);
            setProvisioningStatus('Pairing code generated. Waiting for primary device to link...');
        } catch (err) {
            setProvisioningStatus('Error: ' + err.message);
        }
    };

    // ─── Link Device (For Primary Device) ──────────────────────────────
    const handleLinkDeviceSubmit = async (e) => {
        e.preventDefault();
        if (!pastedCode.trim()) return;

        setProvisioningStatus('Decrypting linking code...');
        try {
            const rawJson = window.atob(pastedCode.trim());
            const parsed = JSON.parse(rawJson);

            const targetDeviceId = parsed.deviceId;
            const targetPubKey = parsed.pubKey;

            if (!targetDeviceId || !targetPubKey) {
                throw new Error('Invalid linking code format');
            }

            setProvisioningStatus('Generating ephemeral pairing key...');
            // Generate our own ephemeral P-256 keys
            const { privateKey, publicKeyBase64 } = await generateProvisioningKeyPair();

            setProvisioningStatus('Deriving shared symmetric key...');
            // Derive shared key using target device's public key
            const aesKey = await deriveSharedKey(privateKey, targetPubKey);

            setProvisioningStatus('Fetching local message history...');
            // Fetch history from IndexedDB
            const messages = await signalStoreAdapter.getAllDecryptedLocalMessages();

            setProvisioningStatus('Packaging cryptographic secrets...');
            // Package identity keys
            const identityBytes = await signalStoreAdapter.getIdentityKeyPair();
            const registrationId = await signalStoreAdapter.getLocalRegistrationId();

            const payload = {
                identityKey: uint8ArrayToBase64(identityBytes),
                registrationId,
                messagesHistory: messages
            };

            setProvisioningStatus('Encrypting credentials...');
            const encryptedPayload = await encryptPayload(aesKey, payload);

            setProvisioningStatus('Relaying payload via secure socket...');
            // Emit to server for relaying
            socketClient.emit('provision:send', {
                targetDeviceId,
                ephemeralPublicKey: publicKeyBase64,
                encryptedPayload
            });

            setProvisioningStatus('Success! Linking instructions sent to target device.');
            setPastedCode('');
            loadData();
        } catch (err) {
            console.error('Failed to link device:', err);
            setProvisioningStatus('Error: ' + err.message);
        }
    };

    // ─── Unlink Device ────────────────────────────────────────────────
    const handleUnlink = (targetId) => {
        setTargetUnlinkId(targetId);
        setUnlinkConfirmOpen(true);
    };

    const confirmUnlink = async () => {
        if (!targetUnlinkId) return;
        try {
            const res = await chatService.unlinkDevice(targetUnlinkId);
            if (res.selfUnlinked) {
                // Wipe local database and redirect
                await signalStoreAdapter.deleteAllLocalData();
                window.location.href = '/login';
            } else {
                showToast('Device unlinked successfully', 'success');
                loadData();
            }
        } catch (err) {
            showToast('Failed to unlink: ' + err.message, 'error');
        } finally {
            setTargetUnlinkId(null);
        }
    };

    // ─── Promotion Recovery Code ──────────────────────────────────────
    const handleRequestRecovery = async () => {
        setRecoveryStatus('Requesting recovery code...');
        try {
            await chatService.requestRecoveryCode();
            setShowRecoveryForm(true);
            setRecoveryStatus('Recovery code sent! Please check server logs.');
        } catch (err) {
            setRecoveryStatus('Error: ' + err.message);
        }
    };

    const handleVerifyRecovery = async (e) => {
        e.preventDefault();
        setRecoveryStatus('Promoting device to primary...');
        try {
            await chatService.verifyRecoveryCode(recoveryCode);
            setRecoveryStatus('Success! Promoted to primary device.');
            setShowRecoveryForm(false);
            setRecoveryCode('');
            loadData();
        } catch (err) {
            setRecoveryStatus('Error: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <svg className="animate-spin h-8 w-8 text-[#1D7A54]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    return (
        <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-950">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M8 12h.01M12 16h.01M16 16h.01M8 16h.01" />
                    </svg>
                    Linked Devices & E2EE Identity
                </h2>
                <div className="flex gap-2">
                    {currentDeviceId && (
                        <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Device ID: {currentDeviceId}
                        </span>
                    )}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isPrimary ? 'text-[#1D7A54] bg-[#EAF5F0]' : 'text-amber-700 bg-amber-50'}`}>
                        {isPrimary ? 'Primary Device' : 'Secondary Device'}
                    </span>
                </div>
            </div>

            {/* UNLINKED DEVICE FLOW */}
            {isWiped && (
                <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-amber-900">Device Unlinked / Identity Missing</h4>
                        <p className="text-xs text-amber-700">This device has not been linked to your cryptographic account yet. You cannot send or read encrypted messages until linked.</p>
                    </div>

                    {!linkingCode ? (
                        <button
                            onClick={handleGeneratePairingCode}
                            className="bg-[#1D7A54] hover:bg-[#155D3F] text-white text-xs font-semibold py-2.5 px-5 rounded-full transition-all active:scale-[0.98] cursor-pointer"
                        >
                            Generate Pairing Code
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                {/* QR Code Generator */}
                                <div className="p-3 bg-white border border-gray-100 rounded-2xl shrink-0 shadow-sm">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkingCode)}`}
                                        alt="Pairing QR Code"
                                        className="w-44 h-44"
                                    />
                                </div>
                                <div className="space-y-2 flex-1 w-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Copy linking code:</label>
                                    <textarea
                                        readOnly
                                        value={linkingCode}
                                        onClick={(e) => e.target.select()}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-xs text-gray-500 font-mono h-24 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-gray-400">Scan this QR code from your primary device or copy this code and paste it in settings on your primary device.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {provisioningStatus && (
                        <div className="text-xs font-semibold text-gray-600 pl-1">
                            Status: <span className="text-[#1D7A54]">{provisioningStatus}</span>
                        </div>
                    )}
                </div>
            )}

            {/* LINKED DEVICES LIST */}
            {!isWiped && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        {devices.map((dev) => (
                            <div key={dev.deviceId} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">
                                            {dev.deviceName.toLowerCase().includes('phone') || dev.deviceName.toLowerCase().includes('ios') || dev.deviceName.toLowerCase().includes('android') ? 'smartphone' : 'laptop_mac'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-950">
                                            {dev.deviceName} {dev.deviceId === currentDeviceId && ' (This Device)'}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Last active: {new Date(dev.lastSeenAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {dev.isPrimary && (
                                        <span className="text-[9px] font-extrabold text-[#1D7A54] bg-[#EAF5F0] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Primary
                                        </span>
                                    )}
                                    {/* Unlink button */}
                                    {(isPrimary || dev.deviceId === currentDeviceId) && (
                                        <button
                                            onClick={() => handleUnlink(dev.deviceId)}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-full uppercase tracking-wider transition-colors cursor-pointer"
                                        >
                                            {dev.deviceId === currentDeviceId ? 'Sign Out' : 'Unlink'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ACTIONS FOR LINKED DEVICE */}
                    <div className="border-t border-gray-100 pt-6 space-y-4">
                        {/* If Primary: show Link Device Form */}
                        {isPrimary ? (
                            <form onSubmit={handleLinkDeviceSubmit} className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Link a New Device</h4>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-gray-50 border border-gray-100 rounded-full py-2.5 px-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-xs"
                                        type="text"
                                        placeholder="Paste linking code from the unlinked device..."
                                        value={pastedCode}
                                        onChange={(e) => setPastedCode(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-black text-white px-5 rounded-full text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        Link
                                    </button>
                                </div>
                                {provisioningStatus && (
                                    <div className="text-[11px] font-semibold text-[#1D7A54] pl-1">
                                        {provisioningStatus}
                                    </div>
                                )}
                            </form>
                        ) : (
                            /* If Secondary: show Promotion Option */
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-bold text-amber-900">Need to unlink other devices?</h4>
                                        <p className="text-[11px] text-amber-700/70">Only the primary device has linking and unlinking authority. You can promote this device to primary using a recovery code.</p>
                                    </div>
                                    {!showRecoveryForm && (
                                        <button
                                            onClick={handleRequestRecovery}
                                            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 px-4 rounded-full transition-colors cursor-pointer shrink-0"
                                        >
                                            Promote to Primary
                                        </button>
                                    )}
                                </div>

                                {showRecoveryForm && (
                                    <form onSubmit={handleVerifyRecovery} className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Enter 6-digit recovery code:</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-white border border-gray-100 rounded-full py-2 px-4 text-gray-800 text-xs font-mono tracking-widest focus:outline-none"
                                                type="text"
                                                maxLength={6}
                                                placeholder="123456"
                                                value={recoveryCode}
                                                onChange={(e) => setRecoveryCode(e.target.value)}
                                            />
                                            <button
                                                type="submit"
                                                className="bg-black text-white px-5 rounded-full text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {recoveryStatus && (
                                    <div className="text-[11px] font-semibold text-gray-700 pl-1">
                                        Status: <span className="text-[#1D7A54]">{recoveryStatus}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ConfirmationModal
                isOpen={unlinkConfirmOpen}
                onClose={() => {
                    setUnlinkConfirmOpen(false);
                    setTargetUnlinkId(null);
                }}
                onConfirm={confirmUnlink}
                title={targetUnlinkId === currentDeviceId ? "Sign Out" : "Unlink Device"}
                message={targetUnlinkId === currentDeviceId 
                    ? "Are you sure you want to sign out and unlink this device? Your local cryptographic cache will be wiped." 
                    : `Are you sure you want to unlink Device ${targetUnlinkId}?`}
                confirmText={targetUnlinkId === currentDeviceId ? "Sign Out" : "Unlink"}
            />
        </section>
    );
}
