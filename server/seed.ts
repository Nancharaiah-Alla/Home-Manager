import { run, queryAll } from './db';
import bcrypt from 'bcryptjs';

export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', color: '#16A34A', icon: 'ShoppingBag' },
  { name: 'Online Shopping', color: '#2563EB', icon: 'Package' },
  { name: 'Home Essentials', color: '#D97706', icon: 'Home' },
  { name: 'Bills & Utilities', color: '#DC2626', icon: 'Zap' },
  { name: 'Food & Dining', color: '#EA580C', icon: 'Utensils' },
  { name: 'Transport & Fuel', color: '#4F46E5', icon: 'Car' },
  { name: 'Medical & Healthcare', color: '#059669', icon: 'HeartPulse' },
  { name: 'Education', color: '#7C3AED', icon: 'GraduationCap' },
  { name: 'Personal & Care', color: '#DB2777', icon: 'User' },
  { name: 'Repairs & Maintenance', color: '#4B5563', icon: 'Wrench' },
  { name: 'Entertainment & Leisure', color: '#0284C7', icon: 'Film' },
  { name: 'Other', color: '#64748B', icon: 'MoreHorizontal' },
];

export const DEFAULT_MERCHANTS = [
  { name: 'Amazon', category: 'Online Shopping', type: 'variable' },
  { name: 'Flipkart', category: 'Online Shopping', type: 'variable' },
  { name: 'Blinkit', category: 'Groceries', type: 'variable' },
  { name: 'Zepto', category: 'Groceries', type: 'variable' },
  { name: 'Instamart', category: 'Groceries', type: 'variable' },
  { name: 'Local Store', category: 'Groceries', type: 'variable' },
  { name: 'Supermarket', category: 'Groceries', type: 'variable' },
  { name: 'Electricity Board', category: 'Bills & Utilities', type: 'fixed' },
  { name: 'Internet / WiFi', category: 'Bills & Utilities', type: 'fixed' },
  { name: 'Mobile Recharge', category: 'Bills & Utilities', type: 'fixed' },
  { name: 'House Rent', category: 'Home Essentials', type: 'fixed' },
  { name: 'Building Maintenance', category: 'Home Essentials', type: 'fixed' },
  { name: 'Pharmacy / Apollo', category: 'Medical & Healthcare', type: 'variable' },
  { name: 'Petrol / Fuel Station', category: 'Transport & Fuel', type: 'variable' },
  { name: 'Other', category: 'Other', type: 'variable' },
];

export function ensureDefaultCategoriesAndMerchants(homeId: string): { categories: Record<string, string>; merchants: Record<string, string> } {
  const existingCats = queryAll<{ id: string; name: string }>(
    'SELECT id, name FROM categories WHERE home_id = ?',
    [homeId]
  );
  const catMap: Record<string, string> = {};
  for (const c of existingCats) {
    catMap[c.name] = c.id;
  }

  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    if (!catMap[cat.name]) {
      const id = 'cat_' + Math.random().toString(36).substring(2, 10);
      run(
        'INSERT INTO categories (id, home_id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
        [id, homeId, cat.name, cat.color, cat.icon, now]
      );
      catMap[cat.name] = id;
    }
  }

  const existingMerchants = queryAll<{ id: string; name: string }>(
    'SELECT id, name FROM merchants WHERE home_id = ?',
    [homeId]
  );
  const merchantMap: Record<string, string> = {};
  for (const m of existingMerchants) {
    merchantMap[m.name] = m.id;
  }

  for (const m of DEFAULT_MERCHANTS) {
    if (!merchantMap[m.name]) {
      const id = 'mer_' + Math.random().toString(36).substring(2, 10);
      const catId = catMap[m.category] || catMap['Other'];
      run(
        'INSERT INTO merchants (id, home_id, name, default_category_id, default_expense_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, homeId, m.name, catId, m.type, now]
      );
      merchantMap[m.name] = id;
    }
  }

  return { categories: catMap, merchants: merchantMap };
}

export function seedDemoHouseholdIfEmpty(): void {
  const users = queryAll<{ id: string }>('SELECT id FROM users LIMIT 1');
  if (users.length > 0) return;

  const demoUserId = 'usr_demo_primary';
  const partnerUserId = 'usr_demo_partner';
  const homeId = 'home_demo_main';
  const now = '2026-09-26T05:30:00Z';

  const passwordHash = bcrypt.hashSync('password123', 10);

  run(
    'INSERT INTO users (id, email, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [demoUserId, 'demo@homemanager.app', passwordHash, 'Demo User', '#0284C7', now]
  );

  run(
    'INSERT INTO users (id, email, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [partnerUserId, 'partner@homemanager.app', passwordHash, 'Partner', '#E11D48', now]
  );

  run(
    'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [homeId, 'Demo Household', '₹', 'INR', demoUserId, now]
  );

  const member1Id = 'mem_demo';
  const member2Id = 'mem_partner';
  run(
    'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [member1Id, homeId, demoUserId, 'admin', 'Alex', '#0284C7', now]
  );
  run(
    'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [member2Id, homeId, partnerUserId, 'member', 'Sam', '#E11D48', now]
  );

  const { categories: catMap, merchants: merMap } = ensureDefaultCategoriesAndMerchants(homeId);

  // Seed Recurring Expenses (Rent, Electricity, Internet)
  const recRentId = 'rec_rent';
  const recElecId = 'rec_elec';
  const recWifiId = 'rec_wifi';
  const recMobileId = 'rec_mobile';

  run(
    `INSERT INTO recurring_expenses (id, home_id, merchant_id, category_id, name, amount, frequency, due_day, start_date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [recRentId, homeId, merMap['House Rent'], catMap['Home Essentials'], 'Apartment Rent', 15000, 'monthly', 5, '2026-01-01', 'Monthly flat rent transfer', now]
  );

  run(
    `INSERT INTO recurring_expenses (id, home_id, merchant_id, category_id, name, amount, frequency, due_day, start_date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [recElecId, homeId, merMap['Electricity Board'], catMap['Bills & Utilities'], 'Electricity Bill', 2100, 'monthly', 10, '2026-01-01', 'State electricity board', now]
  );

  run(
    `INSERT INTO recurring_expenses (id, home_id, merchant_id, category_id, name, amount, frequency, due_day, start_date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [recWifiId, homeId, merMap['Internet / WiFi'], catMap['Bills & Utilities'], 'High-speed Fiber Broadband', 999, 'monthly', 15, '2026-01-01', 'Airtel Fiber 200Mbps', now]
  );

  run(
    `INSERT INTO recurring_expenses (id, home_id, merchant_id, category_id, name, amount, frequency, due_day, start_date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [recMobileId, homeId, merMap['Mobile Recharge'], catMap['Bills & Utilities'], 'Family Mobile Pack', 749, 'monthly', 28, '2026-01-01', 'Postpaid family connection', now]
  );

  // Seed Monthly Limits (Groceries Limit ₹10,000, Online Shopping Limit ₹5,000, Overall ₹50,000)
  run(
    `INSERT INTO monthly_limits (id, home_id, category_id, limit_amount, month, alert_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 80.0, ?, ?)`,
    ['lim_groceries', homeId, catMap['Groceries'], 10000, now, now]
  );

  run(
    `INSERT INTO monthly_limits (id, home_id, category_id, limit_amount, month, alert_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 80.0, ?, ?)`,
    ['lim_shopping', homeId, catMap['Online Shopping'], 5000, now, now]
  );

  run(
    `INSERT INTO monthly_limits (id, home_id, category_id, limit_amount, month, alert_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 85.0, ?, ?)`,
    ['lim_overall', homeId, null, 55000, now, now]
  );

  // Seed Realistic Expenses (Prompt examples + current month transactions + past month transactions)
  const sampleExpenses = [
    // Current month: September 2026
    {
      id: 'exp_01',
      merchant: 'House Rent',
      category: 'Home Essentials',
      amount: 15000,
      description: 'September Rent',
      expense_type: 'fixed',
      date: '2026-09-05',
      paid_by: member1Id,
      rec_id: recRentId,
      notes: 'Paid via NetBanking'
    },
    {
      id: 'exp_02',
      merchant: 'Electricity Board',
      category: 'Bills & Utilities',
      amount: 2100,
      description: 'September Bill',
      expense_type: 'fixed',
      date: '2026-09-10',
      paid_by: member2Id,
      rec_id: recElecId,
      notes: 'Due on 10th'
    },
    {
      id: 'exp_03',
      merchant: 'Internet / WiFi',
      category: 'Bills & Utilities',
      amount: 999,
      description: 'Fiber Broadband',
      expense_type: 'fixed',
      date: '2026-09-15',
      paid_by: member1Id,
      rec_id: recWifiId,
      notes: 'Auto-debit'
    },
    {
      id: 'exp_04',
      merchant: 'Amazon',
      category: 'Online Shopping',
      amount: 3500,
      description: 'Pressure Cooker',
      expense_type: 'variable',
      date: '2026-09-18',
      paid_by: member1Id,
      rec_id: null,
      notes: 'Hawkins stainless steel 5L'
    },
    {
      id: 'exp_05',
      merchant: 'Amazon',
      category: 'Online Shopping',
      amount: 4940,
      description: 'Vacuum Cleaner',
      expense_type: 'variable',
      date: '2026-09-25',
      paid_by: member2Id,
      rec_id: null,
      notes: 'Cordless handheld stick vacuum'
    },
    {
      id: 'exp_06',
      merchant: 'Amazon',
      category: 'Online Shopping',
      amount: 1800,
      description: 'Bedsheet & Pillow Covers',
      expense_type: 'variable',
      date: '2026-09-22',
      paid_by: member2Id,
      rec_id: null,
      notes: '100% cotton king size'
    },
    {
      id: 'exp_07',
      merchant: 'Blinkit',
      category: 'Groceries',
      amount: 680,
      description: 'Quick Groceries (Milk, Eggs, Bread)',
      expense_type: 'variable',
      date: '2026-09-24',
      paid_by: member1Id,
      rec_id: null,
      notes: 'Delivered in 12 mins'
    },
    {
      id: 'exp_08',
      merchant: 'Local Store',
      category: 'Groceries',
      amount: 2400,
      description: 'Monthly Groceries & Pulses',
      expense_type: 'variable',
      date: '2026-09-08',
      paid_by: member2Id,
      rec_id: null,
      notes: 'Rice, wheat flour, spices, dal'
    },
    {
      id: 'exp_09',
      merchant: 'Supermarket',
      category: 'Groceries',
      amount: 3120,
      description: 'Fresh Fruits & Vegetables',
      expense_type: 'variable',
      date: '2026-09-16',
      paid_by: member1Id,
      rec_id: null,
      notes: 'Bi-weekly restock'
    },
    {
      id: 'exp_10',
      merchant: 'Zepto',
      category: 'Groceries',
      amount: 850,
      description: 'Snacks, Coffee & Tea',
      expense_type: 'variable',
      date: '2026-09-20',
      paid_by: member2Id,
      rec_id: null,
      notes: 'Evening snacks and roasted nuts'
    },
    {
      id: 'exp_11',
      merchant: 'Petrol / Fuel Station',
      category: 'Transport & Fuel',
      amount: 2200,
      description: 'Car Petrol Full Tank',
      expense_type: 'variable',
      date: '2026-09-12',
      paid_by: member1Id,
      rec_id: null,
      notes: 'Shell fuel'
    },
    {
      id: 'exp_12',
      merchant: 'Pharmacy / Apollo',
      category: 'Medical & Healthcare',
      amount: 1450,
      description: 'Monthly Vitamins & First Aid',
      expense_type: 'variable',
      date: '2026-09-14',
      paid_by: member1Id,
      rec_id: null,
      notes: 'Omega 3 and multi-vitamins'
    },

    // August 2026 previous month data for comparison and reports
    {
      id: 'exp_aug_01',
      merchant: 'House Rent',
      category: 'Home Essentials',
      amount: 15000,
      description: 'August Rent',
      expense_type: 'fixed',
      date: '2026-08-05',
      paid_by: member1Id,
      rec_id: recRentId,
      notes: 'August rent'
    },
    {
      id: 'exp_aug_02',
      merchant: 'Electricity Board',
      category: 'Bills & Utilities',
      amount: 2450,
      description: 'August Bill',
      expense_type: 'fixed',
      date: '2026-08-10',
      paid_by: member2Id,
      rec_id: recElecId,
      notes: 'AC usage high'
    },
    {
      id: 'exp_aug_03',
      merchant: 'Internet / WiFi',
      category: 'Bills & Utilities',
      amount: 999,
      description: 'August Fiber Broadband',
      expense_type: 'fixed',
      date: '2026-08-15',
      paid_by: member1Id,
      rec_id: recWifiId,
      notes: ''
    },
    {
      id: 'exp_aug_04',
      merchant: 'Local Store',
      category: 'Groceries',
      amount: 5800,
      description: 'Monthly Provisions',
      expense_type: 'variable',
      date: '2026-08-07',
      paid_by: member1Id,
      rec_id: null,
      notes: ''
    },
    {
      id: 'exp_aug_05',
      merchant: 'Flipkart',
      category: 'Online Shopping',
      amount: 4200,
      description: 'Mixer Grinder',
      expense_type: 'variable',
      date: '2026-08-19',
      paid_by: member2Id,
      rec_id: null,
      notes: '750W copper motor'
    },
  ];

  for (const exp of sampleExpenses) {
    const merId = merMap[exp.merchant] || merMap['Other'];
    const catId = catMap[exp.category] || catMap['Other'];
    run(
      `INSERT INTO expenses (id, home_id, merchant_id, category_id, amount, description, expense_type, date, paid_by_member_id, recurring_expense_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exp.id,
        homeId,
        merId,
        catId,
        exp.amount,
        exp.description,
        exp.expense_type,
        exp.date,
        exp.paid_by,
        exp.rec_id,
        exp.notes,
        now,
        now
      ]
    );
  }
}
