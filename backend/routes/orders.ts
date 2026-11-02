import { Router } from 'express';
import { getOrders, getOrderById } from '../queries/orders';
import { createOrderAction, completeOrderAction, deleteOrderAction } from '../actions/orders';

const router = Router();

router.get('/active', async (req, res) => {
  try {
    const data = await getOrders({ status: 'Pending' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/completed', async (req, res) => {
  try {
    const data = await getOrders({ status: 'Completed' });
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
    const result = await createOrderAction(req.body);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/settle', async (req, res) => {
  try {
    const result = await completeOrderAction(Number(req.params.id), req.body.paymentType || 'Cash', req.body.paidAmount, req.body.discount || 0);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await deleteOrderAction(Number(req.params.id));
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
