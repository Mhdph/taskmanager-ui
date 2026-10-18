/* ---------- seed data ---------- */
import { dOff, minsAgo, uid } from '../core/utils';

export function seed() {
  const members = [
    {
      id: 'm1',
      name: 'Tanjim Islam',
      email: 'hello@gr8rstudio.com',
      role: 'Owner',
      team: 'product',
      title: 'مدیر محصول',
      c: '#5A67D8',
      status: 'active',
      last: 0,
      tz: 'سان‌فرانسیسکو',
    },
    {
      id: 'm2',
      name: 'Sarah Chen',
      email: 'sarah@gr8rstudio.com',
      role: 'Admin',
      team: 'design',
      title: 'سرپرست طراحی',
      c: '#C54B78',
      status: 'active',
      last: 4,
      tz: 'نیویورک',
    },
    {
      id: 'm3',
      name: 'John Carter',
      email: 'john@gr8rstudio.com',
      role: 'Member',
      team: 'eng',
      title: 'مهندس فرانت‌اند',
      c: '#3B82C4',
      status: 'active',
      last: 22,
      tz: 'لندن',
    },
    {
      id: 'm4',
      name: 'Emma Wilson',
      email: 'emma@gr8rstudio.com',
      role: 'Member',
      team: 'design',
      title: 'طراح محصول',
      c: '#23918A',
      status: 'active',
      last: 9,
      tz: 'برلین',
    },
    {
      id: 'm5',
      name: 'Priya Patel',
      email: 'priya@gr8rstudio.com',
      role: 'Member',
      team: 'mkt',
      title: 'استراتژیست محتوا',
      c: '#C48A1E',
      status: 'active',
      last: 95,
      tz: 'تورنتو',
    },
    {
      id: 'm6',
      name: 'Marcus Lee',
      email: 'marcus@gr8rstudio.com',
      role: 'Member',
      team: 'eng',
      title: 'مهندس بک‌اند',
      c: '#8662C9',
      status: 'active',
      last: 240,
      tz: 'سنگاپور',
    },
    {
      id: 'm7',
      name: 'Lena Fischer',
      email: 'lena@gr8rstudio.com',
      role: 'Admin',
      team: 'product',
      title: 'سرپرست تضمین کیفیت',
      c: '#3D8E5F',
      status: 'active',
      last: 1500,
      tz: 'مونیخ',
    },
    {
      id: 'm8',
      name: 'Diego Alvarez',
      email: 'diego@freelance.io',
      role: 'Guest',
      team: 'mkt',
      title: 'نویسنده آزاد',
      c: '#C0612B',
      status: 'invited',
      last: null,
      tz: 'مادرید',
    },
  ];
  const projects = [
    {
      id: 'p1',
      key: 'WEB',
      name: 'بازطراحی وب‌سایت',
      icon: 'globe',
      color: 'indigo',
      status: 'active',
      team: 'design',
      lead: 'm2',
      due: dOff(24),
      start: dOff(-30),
      fav: true,
      members: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
      desc: 'بازسازی سایت با معماری اطلاعات روشن‌تر، کتابخانه اجزای واکنش‌گرا و وبلاگ سریع‌تر.',
      milestones: [
        { name: 'تأیید وایرفریم‌ها', date: dOff(2) },
        { name: 'تحویل به توسعه‌دهنده', date: dOff(14) },
        { name: 'عرضه عمومی', date: dOff(24) },
      ],
      last: 12,
    },
    {
      id: 'p2',
      key: 'MOB',
      name: 'اپلیکیشن موبایل',
      icon: 'smartphone',
      color: 'blue',
      status: 'active',
      team: 'eng',
      lead: 'm3',
      due: dOff(52),
      start: dOff(-45),
      fav: true,
      members: ['m1', 'm3', 'm4', 'm6', 'm7'],
      desc: 'اپلیکیشن iOS و اندروید برای تیم‌های میدانی، با همگام‌سازی آفلاین، اعلان و ورود زیست‌سنجی.',
      milestones: [
        { name: 'نسخه آزمایشی', date: dOff(9) },
        { name: 'ارسال به فروشگاه اپلیکیشن', date: dOff(45) },
      ],
      last: 48,
    },
    {
      id: 'p3',
      key: 'MKT',
      name: 'کمپین بازاریابی',
      icon: 'megaphone',
      color: 'rose',
      status: 'planning',
      team: 'mkt',
      lead: 'm5',
      due: dOff(40),
      start: dOff(-10),
      fav: false,
      members: ['m1', 'm4', 'm5', 'm7', 'm8'],
      desc: 'کمپین آگاهی‌بخشی فصل چهارم با تبلیغات شبکه‌های اجتماعی، ایمیل و وبینار عرضه برای مدیران عملیات.',
      milestones: [
        { name: 'نهایی‌سازی طرح‌ها', date: dOff(12) },
        { name: 'اجرای کمپین', date: dOff(21) },
      ],
      last: 130,
    },
    {
      id: 'p4',
      key: 'LCH',
      name: 'عرضه محصول',
      icon: 'rocket',
      color: 'amber',
      status: 'risk',
      team: 'product',
      lead: 'm1',
      due: dOff(12),
      start: dOff(-21),
      fav: false,
      members: ['m1', 'm2', 'm3', 'm5', 'm7'],
      desc: 'هماهنگی عرضه نسخه دوم گردش‌کار: قیمت‌گذاری، مستندات، رسانه و پشتیبانی فروش بین تیم‌ها.',
      milestones: [
        { name: 'تصمیم انتشار', date: dOff(11) },
        { name: 'روز عرضه', date: dOff(12) },
      ],
      last: 35,
    },
    {
      id: 'p5',
      key: 'DS',
      name: 'سیستم طراحی',
      icon: 'component',
      color: 'violet',
      status: 'active',
      team: 'design',
      lead: 'm2',
      due: dOff(70),
      start: dOff(-60),
      fav: false,
      members: ['m2', 'm3', 'm4'],
      desc: 'توکن‌ها، اجزا و مستندات مشترک تیم‌های وب و موبایل.',
      milestones: [{ name: 'توکن‌های نسخه دوم', date: dOff(3) }],
      last: 300,
    },
    {
      id: 'p6',
      key: 'CP',
      name: 'پرتال مشتریان',
      icon: 'building-2',
      color: 'teal',
      status: 'hold',
      team: 'eng',
      lead: 'm6',
      due: dOff(90),
      start: dOff(-5),
      fav: false,
      members: ['m6', 'm7'],
      private: true,
      desc: 'پرتال صورتحساب و پشتیبانی مشتریان سازمانی؛ دسترسی هنگام بررسی قرارداد محدود است.',
      milestones: [],
      last: 2880,
    },
    {
      id: 'p7',
      key: 'MW',
      name: 'وب‌سایت بازاریابی',
      icon: 'layout-grid',
      color: 'green',
      status: 'complete',
      team: 'mkt',
      lead: 'm5',
      due: dOff(-18),
      start: dOff(-80),
      fav: false,
      members: ['m1', 'm3', 'm5'],
      desc: 'سایت عرضه بهاره منتشر شده و برای نگهداری به تیم وب تحویل داده شده است.',
      milestones: [],
      last: 26000,
    },
  ];
  let n = 0;
  const T: any[] = [];
  const t = (p, title, status, a, prio, due, labels: string[] = [], x: Record<string, any> = {}) => {
    const proj = projects.find(q => q.id === p);
    const count = T.filter(q => q.project === p).length + 1;
    T.push(
      Object.assign(
        {
          id: 't' + ++n,
          key: (proj?.key || p) + '-' + (100 + count * 3),
          project: p,
          title,
          status,
          assignee: a,
          priority: prio,
          due: due == null ? null : dOff(due),
          start: due == null ? null : dOff(due - (x.len || 4)),
          labels,
          subtasks: [],
          attachments: [],
          deps: [],
          desc: '',
          estimate: x.est || null,
          created: minsAgo(60 * 24 * (x.age || 12)),
          updated: minsAgo(60 * (x.upd || 30)),
          order: n,
          fav: false,
          recur: null,
        },
        x,
      ),
    );
  };
  // Website Redesign
  t('p1', 'ارزیابی ناوبری فعلی', 'done', 'm2', 'high', -12, ['research'], { est: '2d', len: 5, age: 28 });
  t('p1', 'خلاصه مصاحبه‌های ذی‌نفعان', 'done', 'm1', 'medium', -9, ['research'], { est: '1d', age: 26 });
  t('p1', 'ساخت وایرفریم صفحه اصلی', 'review', 'm2', 'high', 1, ['design'], {
    est: '3d',
    len: 7,
    fav: true,
    desc: '<p>کم-fidelity wireframes for the new homepage covering <b>desktop, tablet, and mobile</b> breakpoints.</p><ul><li>بخش اصلی با ارزش پیشنهادی محصول</li><li>نشان مشتریان و شواهد موفقیت</li><li>نمای کلی قابلیت‌ها با پیوند به صفحه‌های محصول</li></ul><p>برای تصمیم‌های معماری اطلاعات، ارزیابی ناوبری را ببینید.</p>',
    subtasks: [
      { id: 's1', title: 'چیدمان دسکتاپ', done: true },
      { id: 's2', title: 'چیدمان تبلت', done: true },
      { id: 's3', title: 'چیدمان موبایل', done: true },
      { id: 's4', title: 'توضیح تعامل‌ها', done: false },
    ],
    attachments: [
      { id: 'a1', name: 'homepage-wireframes-v3.fig', type: 'fig', size: '4.2 MB', by: 'm2', at: minsAgo(300) },
      { id: 'a2', name: 'nav-audit-findings.pdf', type: 'pdf', size: '860 KB', by: 'm2', at: minsAgo(8000) },
    ],
  });
  t('p1', 'نهایی‌سازی ناوبری', 'progress', 'm3', 'high', 0, ['design', 'frontend'], {
    est: '2d',
    len: 4,
    subtasks: [
      { id: 's5', title: 'ساختار اصلی ناوبری', done: true },
      { id: 's6', title: 'محتوای منوی گسترده', done: false },
      { id: 's7', title: 'رفتار پنل موبایل', done: false },
    ],
  });
  t('p1', 'طراحی ناوبری واکنش‌گرا', 'progress', 'm4', 'medium', 3, ['design'], {
    est: '3d',
    len: 6,
    subtasks: [
      { id: 's8', title: 'قواعد اندازه صفحه', done: true },
      { id: 's9', title: 'وضعیت‌های سربرگ ثابت', done: false },
    ],
  });
  t('p1', 'آماده‌سازی توکن‌های سیستم طراحی', 'todo', 'm1', 'medium', 6, ['design'], { est: '2d', len: 4 });
  t('p1', 'بررسی چیدمان‌های واکنش‌گرا', 'todo', 'm4', 'medium', 8, ['qa', 'design'], { est: '1d', len: 3 });
  t('p1', 'آماده‌سازی تحویل به توسعه‌دهنده', 'todo', 'm2', 'high', 14, ['frontend'], { est: '2d', len: 4, deps: ['t3', 't5'] });
  t('p1', 'طراحی راه‌اندازی موبایل', 'progress', 'm4', 'urgent', -1, ['design'], {
    est: '3d',
    len: 6,
    subtasks: [
      { id: 's10', title: 'صفحه‌های خوشامدگویی', done: true },
      { id: 's11', title: 'درخواست‌های مجوز', done: false },
      { id: 's12', title: 'وضعیت‌های خالی', done: false },
    ],
  });
  t('p1', 'نوشتن متن صفحه اصلی', 'backlog', 'm5', 'low', 18, ['content'], { est: '2d' });
  t('p1', 'تنظیم رویدادهای تحلیل', 'backlog', 'm6', 'medium', 20, ['backend', 'growth'], { est: '1d' });
  t('p1', 'ارزیابی دسترس‌پذیری قالب‌ها', 'backlog', 'm7', 'high', 22, ['qa'], { est: '2d' });
  t('p1', 'ساخت بخش اصلی صفحه', 'todo', 'm3', 'medium', 10, ['frontend'], { est: '2d', len: 3, deps: ['t3'] });
  t('p1', 'فرایند بهینه‌سازی تصاویر', 'review', 'm6', 'low', 2, ['backend'], { est: '1d', len: 5 });
  t('p1', 'یادداشت‌های هماهنگی هفتگی طراحی', 'todo', 'm1', 'low', 2, ['content'], { recur: 'Weekly', est: '30m', len: 0 });
  t('p1', 'انتقال وبلاگ به سامانه مدیریت محتوای جدید', 'backlog', 'm3', 'medium', 28, ['backend'], { est: '5d', len: 8 });
  t('p1', 'پاورقی و صفحه‌های حقوقی', 'done', 'm5', 'low', -5, ['frontend'], { est: '1d' });
  t('p1', 'اصلاح پیوندهای خراب صفحه قیمت‌گذاری', 'done', 'm3', 'medium', -3, ['bug'], { est: '2h', len: 1 });
  // Mobile App
  t('p2', 'نمونه اولیه فرایند راه‌اندازی', 'progress', 'm4', 'high', 4, ['design'], { est: '3d', len: 6 });
  t('p2', 'سرویس اعلان دستگاه', 'progress', 'm6', 'high', 6, ['backend'], { est: '5d', len: 9 });
  t('p2', 'همگام‌سازی آفلاین', 'todo', 'm3', 'urgent', 5, ['frontend', 'backend'], { est: '8d', len: 10, deps: ['t20'] });
  t('p2', 'تصاویر فروشگاه اپلیکیشن', 'backlog', 'm5', 'low', 40, ['content'], { est: '1d' });
  t('p2', 'راه‌اندازی گزارش خطا', 'done', 'm6', 'medium', -8, ['backend'], { est: '1d' });
  t('p2', 'ورود زیست‌سنجی', 'review', 'm3', 'high', 2, ['frontend'], { est: '3d', len: 6 });
  t('p2', 'بازطراحی صفحه تنظیمات', 'todo', 'm4', 'medium', 9, ['design'], { est: '2d' });
  t('p2', 'اولویت‌بندی بازخورد کاربران آزمایشی', 'todo', 'm1', 'medium', 0, ['research'], { est: '4h', len: 1, recur: 'Weekly' });
  t('p2', 'بسته‌شدن برنامه هنگام چرخش در اندروید ۱۲', 'todo', 'm3', 'urgent', 1, ['bug'], { est: '1d', len: 1 });
  // Marketing Campaign
  t('p3', 'شرح کمپین', 'done', 'm5', 'medium', -6, ['content'], { est: '1d' });
  t('p3', 'متن صفحه فرود', 'progress', 'm5', 'medium', 4, ['content'], { est: '2d' });
  t('p3', 'طرح‌های تبلیغات شبکه‌های اجتماعی', 'todo', 'm4', 'high', 7, ['design', 'growth'], { est: '3d', len: 5 });
  t('p3', 'زنجیره ایمیل‌های پرورش مشتری', 'todo', 'm8', 'medium', 9, ['content'], { est: '2d' });
  t('p3', 'فهرست ارتباط با اینفلوئنسرها', 'backlog', 'm7', 'low', null, ['growth']);
  t('p3', 'ارائه وبینار عرضه', 'todo', 'm1', 'medium', 15, ['content'], { est: '2d' });
  t('p3', 'تأیید بودجه', 'review', 'm1', 'urgent', -2, [], { est: '1h', len: 1 });
  // Product Launch
  t('p4', 'چک‌لیست آمادگی عرضه', 'progress', 'm1', 'urgent', 3, ['qa'], {
    est: '1d',
    len: 10,
    subtasks: [
      { id: 's20', title: 'انتشار مستندات', done: true },
      { id: 's21', title: 'انتشار قیمت‌ها', done: false },
      { id: 's22', title: 'آموزش تیم پشتیبانی', done: false },
      { id: 's23', title: 'به‌روزرسانی صفحه وضعیت', done: true },
    ],
  });
  t('p4', 'به‌روزرسانی صفحه قیمت‌گذاری', 'todo', 'm2', 'high', 6, ['design', 'frontend'], { est: '2d' });
  t('p4', 'پیش‌نویس بیانیه خبری', 'review', 'm5', 'medium', 1, ['content'], { est: '1d' });
  t('p4', 'اسناد پشتیبانی فروش', 'todo', 'm7', 'medium', 8, ['content'], { est: '2d' });
  t('p4', 'یادداشت‌های انتشار', 'backlog', 'm3', 'low', 11, ['content'], { est: '4h' });
  t('p4', 'جلسه تصمیم انتشار', 'todo', 'm1', 'high', 11, [], { est: '1h', len: 0 });
  // Design System
  t('p5', 'نسخه دوم توکن‌های رنگ', 'done', 'm2', 'high', -4, ['design'], { est: '3d' });
  t('p5', 'ارزیابی اجزای دکمه', 'progress', 'm2', 'medium', 5, ['design', 'frontend'], { est: '2d' });
  t('p5', 'وضعیت‌های ورودی فرم', 'todo', 'm4', 'medium', 12, ['design'], { est: '3d' });
  t('p5', 'مرتب‌سازی کتابخانه آیکن', 'backlog', 'm4', 'low', null, ['design']);
  t('p5', 'سایت مستندات', 'todo', 'm3', 'medium', 20, ['frontend'], { est: '5d', len: 8 });
  t('p5', 'پالت حالت تیره', 'review', 'm2', 'high', 2, ['design'], { est: '2d' });
  // Marketing Website (complete)
  t('p7', 'تضمین کیفیت سایت عرضه', 'done', 'm3', 'high', -20, ['qa']);
  t('p7', 'ویدیوی اصلی عرضه بهاره', 'done', 'm5', 'medium', -24, ['content']);
  // Customer portal (restricted)
  t('p6', 'قرارداد API صورتحساب', 'todo', 'm6', 'high', 30, ['backend']);

  const tk = id => T.find(x => x.id === id);
  // completed metadata
  T.filter(x => x.status === 'done').forEach((x, i) => (x.completedAt = minsAgo(60 * (6 + i * 17))));
  const comments = [
    {
      id: 'c1',
      task: 't3',
      by: 'm4',
      at: minsAgo(260),
      text: 'چیدمان تبلت کنار نشان‌ها شلوغ شده است. می‌توانیم در عرض کمتر از ۱۰۲۴ پیکسل فقط چهار نشان نمایش دهیم؟',
      re: { '👍': ['m2', 'm3'] },
    },
    { id: 'c2', task: 't3', by: 'm2', at: minsAgo(210), text: 'پیشنهاد خوبی بود. در نسخه سوم به‌روز شد. @Tanjim Islam لطفاً تا پنجشنبه بررسی کنید.', re: {} },
    {
      id: 'c3',
      task: 't3',
      by: 'm3',
      at: minsAgo(95),
      text: 'فاصله‌گذاری بخش اصلی با شبکه ۸ واحدی هماهنگ است. از نظر مهندسی مانعی وجود ندارد.',
      re: { '🎉': ['m2'] },
    },
    { id: 'c4', task: 't4', by: 'm3', at: minsAgo(400), text: 'محتوای منوی گسترده هنوز از بازاریابی نرسیده است. فعلاً متن موقت می‌گذارم.', re: {} },
    { id: 'c5', task: 't4', by: 'm5', at: minsAgo(120), text: '@John Carter محتوا در سند مشترک قرار گرفت؛ حداکثر شش ستون.', re: { '👍': ['m3'] } },
    { id: 'c6', task: 't9', by: 'm1', at: minsAgo(55), text: 'مهلت این مورد دیروز گذشت. @Emma Wilson مانعی برای درخواست‌های مجوز وجود دارد؟', re: {} },
    { id: 'c7', task: 't24', by: 'm7', at: minsAgo(700), text: 'بازگشت از Face ID به رمز در iOS 17 درست کار می‌کند؛ مرحله بعد آزمایش اندروید است.', re: {} },
    { id: 'c8', task: 't34', by: 'm2', at: minsAgo(1500), text: 'بخش مالی برای تأیید به تفکیک کانال‌ها نیاز دارد.', re: {} },
    { id: 'c9', task: 't35', by: 'm7', at: minsAgo(200), text: 'آموزش پشتیبانی به دوشنبه منتقل شد. @Tanjim Islam لطفاً متن صفحه وضعیت را تأیید کنید.', re: {} },
  ];
  const A = (by, verb, task, project, m, extra = '') => ({ id: uid('a'), by, verb, task, project, at: minsAgo(m), extra });
  const activity = [
    A('m2', 'moved', 't3', 'p1', 38, 'به وضعیت بررسی'),
    A('m3', 'completed', 't18', 'p1', 90),
    A('m4', 'commented on', 't19', 'p2', 140),
    A('m1', 'changed priority of', 't9', 'p1', 180, 'به اولویت فوری'),
    A('m6', 'added a file to', 't14', 'p1', 260),
    A('m5', 'created', 't30', 'p3', 330),
    A('m2', 'assigned', 't8', 'p1', 420, 'به سارا چن'),
    A('m7', 'completed', 't23', 'p2', 1300),
    A('m3', 'moved', 't24', 'p2', 1500, 'به وضعیت بررسی'),
    A('m1', 'created project', null, 'p4', 30000),
    A('m2', 'created project', null, 'p1', 43000),
    A('m4', 'completed', 't41', 'p5', 5600),
    A('m5', 'completed', 't17', 'p1', 7200),
  ];
  const notifs = [
    {
      id: 'n1',
      type: 'mention',
      by: 'm2',
      task: 't3',
      text: 'به شما اشاره کرد در',
      snippet: 'در نسخه سوم به‌روز شد. @Tanjim Islam لطفاً تا پنجشنبه بررسی کنید.',
      at: minsAgo(210),
      read: false,
    },
    { id: 'n2', type: 'assign', by: 'm3', task: 't28', text: 'به شما واگذار کرد', snippet: 'مهلت امروز · اولویت متوسط', at: minsAgo(300), read: false },
    {
      id: 'n3',
      type: 'comment',
      by: 'm4',
      task: 't9',
      text: 'دیدگاهی نوشت برای',
      snippet: 'درخواست‌های مجوز به بررسی حقوقی نیاز دارند؛ پیش‌نویس در حال آماده‌سازی است.',
      at: minsAgo(40),
      read: false,
    },
    {
      id: 'n4',
      type: 'mention',
      by: 'm7',
      task: 't35',
      text: 'به شما اشاره کرد در',
      snippet: 'آموزش پشتیبانی به دوشنبه منتقل شد. @Tanjim Islam لطفاً متن صفحه وضعیت را تأیید کنید.',
      at: minsAgo(200),
      read: false,
    },
    { id: 'n5', type: 'update', by: 'm2', task: 't3', text: 'به وضعیت بررسی منتقل شد', snippet: 'برای انجام ← در حال بررسی', at: minsAgo(38), read: true },
    {
      id: 'n6',
      type: 'update',
      by: null,
      project: 'p4',
      text: 'عرضه محصول در معرض خطر است',
      snippet: '۳ کار با مهلت این هفته هنوز شروع نشده‌اند',
      at: minsAgo(600),
      read: false,
    },
    {
      id: 'n7',
      type: 'comment',
      by: 'm2',
      task: 't34',
      text: 'دیدگاهی نوشت برای',
      snippet: 'بخش مالی برای تأیید به تفکیک کانال‌ها نیاز دارد.',
      at: minsAgo(1500),
      read: true,
    },
    { id: 'n8', type: 'assign', by: 'm2', task: 't6', text: 'به شما واگذار کرد', snippet: 'مهلت تا ۶ روز دیگر', at: minsAgo(2900), read: true },
    { id: 'n9', type: 'update', by: 'm3', task: 't18', text: 'completed', snippet: 'اصلاح پیوندهای خراب صفحه قیمت‌گذاری', at: minsAgo(90), read: true },
    {
      id: 'n10',
      type: 'update',
      by: null,
      task: 't28',
      text: 'مهلت انجامش امروز است',
      snippet: 'اولویت‌بندی بازخورد کاربران آزمایشی',
      at: minsAgo(20),
      read: false,
    },
  ];
  const files = [
    { id: 'f1', project: 'p1', name: 'homepage-wireframes-v3.fig', type: 'fig', size: '4.2 MB', by: 'm2', at: minsAgo(300), task: 't3' },
    { id: 'f2', project: 'p1', name: 'nav-audit-findings.pdf', type: 'pdf', size: '860 KB', by: 'm2', at: minsAgo(8000), task: 't3' },
    { id: 'f3', project: 'p1', name: 'brand-photography-set.zip', type: 'zip', size: '128 MB', by: 'm4', at: minsAgo(3000) },
    { id: 'f4', project: 'p1', name: 'hero-exploration.png', type: 'img', size: '2.1 MB', by: 'm4', at: minsAgo(1400) },
    { id: 'f5', project: 'p1', name: 'content-inventory.xlsx', type: 'sheet', size: '310 KB', by: 'm5', at: minsAgo(9000) },
    { id: 'f6', project: 'p1', name: 'sitemap-v2.pdf', type: 'pdf', size: '540 KB', by: 'm1', at: minsAgo(12000) },
    { id: 'f7', project: 'p1', name: 'interview-notes.docx', type: 'doc', size: '96 KB', by: 'm1', at: minsAgo(20000) },
    { id: 'f8', project: 'p1', name: 'analytics-events.json', type: 'code', size: '12 KB', by: 'm6', at: minsAgo(700) },
    { id: 'f9', project: 'p2', name: 'onboarding-flow.fig', type: 'fig', size: '6.8 MB', by: 'm4', at: minsAgo(500) },
    { id: 'f10', project: 'p2', name: 'beta-feedback.xlsx', type: 'sheet', size: '220 KB', by: 'm1', at: minsAgo(900) },
    { id: 'f11', project: 'p3', name: 'campaign-brief.pdf', type: 'pdf', size: '1.1 MB', by: 'm5', at: minsAgo(4000) },
    { id: 'f12', project: 'p4', name: 'launch-plan.docx', type: 'doc', size: '180 KB', by: 'm1', at: minsAgo(6000) },
  ];
  const events = [
    { id: 'e1', title: 'بررسی طراحی', date: dOff(1), time: '10:00', project: 'p1' },
    { id: 'e2', title: 'برنامه‌ریزی اسپرینت', date: dOff(5), time: '09:30', project: 'p2' },
    { id: 'e3', title: 'هماهنگی عرضه', date: dOff(0), time: '15:00', project: 'p4' },
    { id: 'e4', title: 'نمایش به ذی‌نفعان', date: dOff(9), time: '14:00', project: 'p1' },
    { id: 'e5', title: 'شروع کمپین', date: dOff(-3), time: '11:00', project: 'p3' },
    { id: 'e6', title: 'بازنگری', date: dOff(12), time: '16:00', project: 'p2' },
  ];
  const tmp = tk('t3');
  tmp!.updated = minsAgo(38);
  return {
    ws: { name: 'Gr8r Studio', url: 'gr8rstudio', c: '#1D1C1A', brand: true },
    workspaces: [
      { id: 'w1', name: 'Gr8r Studio', c: '#1D1C1A', plan: 'تیم', brand: true },
      { id: 'w2', name: 'شخصی', c: '#3D8E5F', plan: 'رایگان' },
      { id: 'w3', name: 'Acme Labs', c: '#3B82C4', plan: 'کسب‌وکار' },
    ],
    me: 'm1',
    members,
    projects,
    tasks: T,
    comments,
    activity,
    notifs,
    files,
    events,
    projOrder: projects.map(p => p.id),
    savedViews: [{ id: 'v1', project: 'p1', name: 'اولویت زیاد', type: 'list', filters: [{ f: 'priority', op: 'is', v: ['urgent', 'high'] }] }],
    recentSearches: ['homepage', 'Sarah', 'wireframes'],
    sessions: [
      { id: 'se1', dev: 'MacBook Pro · Chrome', loc: 'سان‌فرانسیسکو، آمریکا', at: 'اکنون فعال', cur: true },
      { id: 'se2', dev: 'iPhone 15 · Gr8r app', loc: 'سان‌فرانسیسکو، آمریکا', at: '۲ ساعت پیش' },
      { id: 'se3', dev: 'Windows · Edge', loc: 'اوکلند، آمریکا', at: 'Sep 12' },
    ],
    invoices: [
      { id: 'INV-2026-009', date: dOff(-23), amt: '$96.00', st: 'پرداخت‌شده' },
      { id: 'INV-2026-008', date: dOff(-53), amt: '$96.00', st: 'پرداخت‌شده' },
      { id: 'INV-2026-007', date: dOff(-84), amt: '$80.00', st: 'پرداخت‌شده' },
      { id: 'INV-2026-006', date: dOff(-114), amt: '$80.00', st: 'پرداخت‌شده' },
    ],
    tfa: false,
    notifPrefs: {
      email_mention: true,
      email_assign: true,
      email_digest: true,
      email_comment: false,
      push_mention: true,
      push_assign: true,
      push_comment: true,
      push_due: true,
      mention_all: true,
      assign_self: true,
    },
  };
}
