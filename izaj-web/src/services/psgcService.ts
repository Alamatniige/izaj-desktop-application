export interface Province { code: string; name: string; regionCode?: string }
export interface City { code: string; name: string; provinceCode?: string; isCity?: boolean }
export interface Barangay { code: string; name: string; cityCode?: string }

class PSGCService {
  async getProvinces(): Promise<Province[]> {
    const res = await fetch('/api/psgc/provinces', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load provinces');
    const data = await res.json();
    return data.provinces as Province[];
  }

  async getCities(provinceCode: string): Promise<City[]> {
    const res = await fetch(`/api/psgc/cities?provinceCode=${encodeURIComponent(provinceCode)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load cities');
    const data = await res.json();
    return data.cities as City[];
  }

  async getBarangays(cityCode: string): Promise<Barangay[]> {
    const res = await fetch(`/api/psgc/barangays?cityCode=${encodeURIComponent(cityCode)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load barangays');
    const data = await res.json();
    return data.barangays as Barangay[];
  }
}

export const psgcService = new PSGCService();

