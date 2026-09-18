import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
// Small UTF-16 chunks also stay below historical iOS UTF-8 value limits.
// Publish the manifest last: an interrupted write never exposes half a session.
export const secureStorage = {
    async getItem(key: string): Promise<string | null> {
        const raw = await SecureStore.getItemAsync(key);
        if (!raw)
            return null;
        const meta = JSON.parse(raw) as {
            generation: string;
            count: number;
        };
        const parts = await Promise.all(Array.from({ length: meta.count }, (_, i) => SecureStore.getItemAsync(`${key}.${meta.generation}.${i}`)));
        return parts.some(part => part === null) ? null : parts.join('');
    },
    async setItem(key: string, value: string) {
        const old = await SecureStore.getItemAsync(key);
        const generation = Crypto.randomUUID();
        const characters = Array.from(value);
        const parts: string[] = [];
        for (let offset = 0; offset < characters.length; offset += 400)
            parts.push(characters.slice(offset, offset + 400).join(''));
        if (!parts.length)
            parts.push('');
        for (let i = 0; i < parts.length; i++)
            await SecureStore.setItemAsync(`${key}.${generation}.${i}`, parts[i], { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        await SecureStore.setItemAsync(key, JSON.stringify({ generation, count: parts.length }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        if (old) {
            const meta = JSON.parse(old);
            await Promise.all(Array.from({ length: meta.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${meta.generation}.${i}`))).catch(() => { });
        }
    },
    async removeItem(key: string) {
        const old = await SecureStore.getItemAsync(key);
        await SecureStore.deleteItemAsync(key);
        if (old) {
            const meta = JSON.parse(old);
            await Promise.all(Array.from({ length: meta.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${meta.generation}.${i}`)));
        }
    },
};
