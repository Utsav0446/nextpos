import { Router } from 'express';
import { getMenuItems, getMenuItemById, createMenuItem, updateMenuItem, deleteMenuItem } from '../queries/menu';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await getMenuItems();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await getMenuItemById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Menu item not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = await createMenuItem(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = await updateMenuItem(Number(req.params.id), req.body);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const data = await deleteMenuItem(Number(req.params.id));
    res.json({ success: data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
