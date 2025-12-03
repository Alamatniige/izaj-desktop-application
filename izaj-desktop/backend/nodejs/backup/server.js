import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const router = express.Router();

const isITMaintenance = (req) => req.user.user_metadata?.is_it_maintenance === true;

// GET /export - Export data (Backup)
router.get('/export', authenticate, async (req, res) => {
    if (!isITMaintenance(req)) {
        return res.status(403).json({ error: 'Access denied.' });
    }

    try {
        // Fetch orders data (includes payment information)
        const backupData = {};

        // Fetch orders with all data including payment info
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!ordersError) {
            backupData.orders = ordersData;
            console.log(`✅ Successfully backed up ${ordersData?.length || 0} orders`);
        } else {
            console.error(`❌ Error backing up orders:`, ordersError);
            backupData.orders = [];
        }

        // Fetch order_items for complete backup
        const { data: orderItemsData, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*');
        
        if (!orderItemsError) {
            backupData.order_items = orderItemsData;
            console.log(`✅ Successfully backed up ${orderItemsData?.length || 0} order items`);
        } else {
            console.error(`❌ Error backing up order_items:`, orderItemsError);
            backupData.order_items = [];
        }

        // Calculate payment statistics from orders
        const paidOrders = ordersData?.filter(o => o.payment_status === 'paid') || [];
        const pendingPayments = ordersData?.filter(o => o.payment_status === 'pending') || [];

        await logAuditEvent(req.user.id, AuditActions.BACKUP, { 
            success: true,
            tables: ['orders', 'order_items'],
            recordCounts: {
                orders: backupData.orders?.length || 0,
                order_items: backupData.order_items?.length || 0,
                paid_orders: paidOrders.length,
                pending_payments: pendingPayments.length
            }
        }, req);
        
        res.json({ 
            success: true, 
            data: backupData, 
            timestamp: new Date().toISOString(),
            summary: {
                totalOrders: backupData.orders?.length || 0,
                totalOrderItems: backupData.order_items?.length || 0,
                paidOrders: paidOrders.length,
                pendingPayments: pendingPayments.length,
                note: 'Payment data is included within orders table (payment_status, payment_method, total_amount)'
            }
        });

    } catch (error) {
        console.error('❌ Backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /restore - Restore data
router.post('/restore', authenticate, async (req, res) => {
    if (!isITMaintenance(req)) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    
    // Restore functionality is disabled for safety reasons
    // Implementing full restore via API is risky without transaction support and proper validation
    return res.status(501).json({ error: 'Restore functionality requires manual database intervention for safety.' });
});

export default router;

