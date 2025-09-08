export const UpstreamService = {
    async fetch(input: string, init?: RequestInit): Promise<Response> {
        return fetch(input, init);
    },
};

export default UpstreamService;


