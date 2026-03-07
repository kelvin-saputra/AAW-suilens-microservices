import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'suilens.events';
const QUEUE_NAME = 'inventory_service_queue';
const INVENTORY_API_URL = process.env.INVENTORY_API_URL || 'http://localhost:3004';

export async function startConsumer() {
    try {
        const connection = await amqplib.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        const q = await channel.assertQueue(QUEUE_NAME, { durable: true });

        await channel.bindQueue(q.queue, EXCHANGE_NAME, 'order.cancelled');

        console.log(`[*] Waiting for messages in ${q.queue}. To exit press CTRL+C`);

        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                console.log(`[x] Received %s: '%s'`, msg.fields.routingKey, event);

                if (msg.fields.routingKey === 'order.cancelled') {
                    await handleOrderCancelled(event.data);
                }

                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Failed to start consumer:', error);
        setTimeout(startConsumer, 5000);
    }
}

async function handleOrderCancelled(data: any) {
    try {
        const { orderId, lensId, branchCode, quantity } = data;

        if (!lensId || !branchCode || !quantity) {
            console.log('Skipping release: Missing lensId, branchCode, or quantity');
            return;
        }

        const response = await fetch(`${INVENTORY_API_URL}/api/inventory/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchCode, lensId, quantity, orderId })
        });

        if (!response.ok) {
            const errData = await response.text();
            console.error('Failed to release inventory via API:', errData);
        } else {
            console.log(`Successfully released inventory via API for order ${orderId}`);
        }
    } catch (error) {
        console.error('Error handling order.cancelled event:', error);
    }
}
