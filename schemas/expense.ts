import { z } from 'zod';

export const expenseSchema = z.object({
  category: z.enum(['Salary', 'Vegetables', 'Milk', 'Gas', 'Rent', 'Electricity', 'Internet', 'Misc']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reason: z.string().min(2, 'Reason must be at least 2 characters').max(255, 'Reason must be less than 255 characters'),
  notes: z.string().optional().nullable().or(z.literal('')),
  expense_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please select a valid date',
  }),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
