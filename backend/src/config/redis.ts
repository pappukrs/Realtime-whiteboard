import Redis from 'ioredis';

export const setupRedis = (host: string, port: number) => {
    const pubClient = new Redis({ host, port });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
    subClient.on('error', (err) => console.error('Redis Sub Error:', err));

    return { pubClient, subClient };
};
