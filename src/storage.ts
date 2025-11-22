import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveData(key: string, value: any) {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error saving data', e);
    }
}

export async function loadData<T = any>(key: string, fallback: T): Promise<T> {
    try {
        const json = await AsyncStorage.getItem(key);
        return json ? JSON.parse(json) : fallback;
    } catch (e) {
        console.error('Error loading data', e);
        return fallback;
    }
}
