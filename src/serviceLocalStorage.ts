import { Memento } from 'vscode';

class ServiceLocalStorage
{
    constructor(private storage: Memento)
    {
    }

    public getValue<T>(key: string): T
    {
        return this.storage.get<T>(key, null);
    }

    public setValue<T>(key: string, value: T)
    {
        this.storage.update(key, value);
    }

    public removeKey(key: string)
    {
        this.storage.update(key, undefined);
    }
}

export default ServiceLocalStorage;