import { Router } from 'express';
import { getActiveOrders, getCompletedOrders, getOrderById } from '../queries/orders';
import { submitOrderAction, settleOrderAction, cancelOrderAction } from '../actions/orders';

const router = Router();

router.get('/active', async (req, res) => {
  try {
    const data = await getActiveOrders();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/completed', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await getCompletedOrders(startDate as string, endDate as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await getOrderById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await submitOrderAction(req.body);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/settle', async (req, res) => {
  try {
    const result = await settleOrderAction(Number(req.params.id), req.body.paymentType, req.body.discount);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await cancelOrderAction(Number(req.params.id));
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
