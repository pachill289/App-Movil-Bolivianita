import { secureStorage } from './secureStorage';
export const DEFAULT_BRANCH = '00000000-0000-4000-8000-000000000001';
export type Branch = { id: string; name: string };
let current = DEFAULT_BRANCH;
export const selectedBranch = () => current;
export async function restoreBranch() { current = await secureStorage.getItem('bolivianita.branch') || DEFAULT_BRANCH; }
export async function selectBranch(id: string) { await secureStorage.setItem('bolivianita.branch',id);current=id; }
