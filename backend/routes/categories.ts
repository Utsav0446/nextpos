import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, softDeleteCategory } from '../queries/categories';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await getCategories();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await getCategoryById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Category not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, name_hi, name_gu, description_hi, description_gu } = req.body;
    const data = await createCategory(name, description, name_hi, name_gu, description_hi, description_gu);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, name_hi, name_gu, description_hi, description_gu } = req.body;
    const data = await updateCategory(Number(req.params.id), name, description, name_hi, name_gu, description_hi, description_gu);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const data = await softDeleteCategory(Number(req.params.id));
    res.json({ success: data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
