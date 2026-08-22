// بيانات تجريبية ثابتة للمنصة - يتم تحميلها مباشرة كمتغيرات JS لتفادي قيود CORS عند فتح الملفات محليًا
// هذه الطبقة (Data Layer) قابلة للاستبدال مستقبلًا بطلبات API حقيقية تجاه Flask/PostgreSQL
'use strict';

const PARKS = [
  {
    "id": "park-01",
    "name": "عالم المرح",
    "city": "طرابلس",
    "address": "شارع الكورنيش، طرابلس",
    "description": "منتزه عائلي متكامل يجمع بين الألعاب المثيرة والمساحات الخضراء الواسعة، مثالي لقضاء يوم ممتع مع العائلة والأصدقاء.",
    "images": [
      "assets/images/park-1.svg"
    ],
    "phone": "0915108603",
    "hours": "10:00 ص - 10:00 م",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.6,
    "reviews_count": 268,
    "price_from": 25,
    "manager_id": "admin-01"
  },
  {
    "id": "park-02",
    "name": "منتزه السعادة",
    "city": "بنغازي",
    "address": "شارع الكورنيش، بنغازي",
    "description": "وجهة ترفيهية حديثة تضم ألعابًا لجميع الأعمار، ومطاعم متنوعة، ومناطق استراحة مظللة على مدار اليوم.",
    "images": [
      "assets/images/park-2.svg"
    ],
    "phone": "0912458591",
    "hours": "9:00 ص - 11:00 م",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.0,
    "reviews_count": 644,
    "price_from": 35,
    "manager_id": "admin-02"
  },
  {
    "id": "park-03",
    "name": "جنة الأطفال",
    "city": "مصراتة",
    "address": "شارع الكورنيش، مصراتة",
    "description": "منتزه مصمم خصيصًا لإسعاد الأطفال والكبار، مع عروض موسمية وفعاليات أسبوعية متجددة.",
    "images": [
      "assets/images/park-3.svg"
    ],
    "phone": "0914903402",
    "hours": "4:00 م - 12:00 ص",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.3,
    "reviews_count": 557,
    "price_from": 20,
    "manager_id": "admin-03"
  },
  {
    "id": "park-04",
    "name": "واحة الترفيه",
    "city": "الزاوية",
    "address": "شارع الكورنيش، الزاوية",
    "description": "تجربة ترفيهية غنية بالألعاب المائية والبرية، وسط أجواء آمنة ومرافق نظيفة على مستوى عالٍ.",
    "images": [
      "assets/images/park-4.svg"
    ],
    "phone": "0918038374",
    "hours": "10:00 ص - 12:00 ص",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.5,
    "reviews_count": 265,
    "price_from": 35,
    "manager_id": "admin-04"
  },
  {
    "id": "park-05",
    "name": "مدينة المغامرات",
    "city": "زليتن",
    "address": "شارع الكورنيش، زليتن",
    "description": "منتزه يجمع بين الإثارة والراحة، بألعاب متدرجة الصعوبة تناسب الجميع من الصغار إلى الكبار.",
    "images": [
      "assets/images/park-5.svg"
    ],
    "phone": "0913678638",
    "hours": "10:00 ص - 10:00 م",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.3,
    "reviews_count": 754,
    "price_from": 15,
    "manager_id": "admin-05"
  },
  {
    "id": "park-06",
    "name": "عالم الألعاب",
    "city": "سبها",
    "address": "شارع الكورنيش، سبها",
    "description": "منتزه عائلي متكامل يجمع بين الألعاب المثيرة والمساحات الخضراء الواسعة، مثالي لقضاء يوم ممتع مع العائلة والأصدقاء.",
    "images": [
      "assets/images/park-6.svg"
    ],
    "phone": "0916647119",
    "hours": "9:00 ص - 11:00 م",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.3,
    "reviews_count": 144,
    "price_from": 20,
    "manager_id": "admin-06"
  },
  {
    "id": "park-07",
    "name": "منتزه النخيل",
    "city": "البيضاء",
    "address": "شارع الكورنيش، البيضاء",
    "description": "وجهة ترفيهية حديثة تضم ألعابًا لجميع الأعمار، ومطاعم متنوعة، ومناطق استراحة مظللة على مدار اليوم.",
    "images": [
      "assets/images/park-1.svg"
    ],
    "phone": "0915437923",
    "hours": "4:00 م - 12:00 ص",
    "status": "مفتوح",
    "status_message": "",
    "rating": 3.9,
    "reviews_count": 866,
    "price_from": 25,
    "manager_id": "admin-07"
  },
  {
    "id": "park-08",
    "name": "جزيرة المرح",
    "city": "الخمس",
    "address": "شارع الكورنيش، الخمس",
    "description": "منتزه مصمم خصيصًا لإسعاد الأطفال والكبار، مع عروض موسمية وفعاليات أسبوعية متجددة.",
    "images": [
      "assets/images/park-2.svg"
    ],
    "phone": "0917350753",
    "hours": "10:00 ص - 12:00 ص",
    "status": "مفتوح",
    "status_message": "",
    "rating": 3.9,
    "reviews_count": 120,
    "price_from": 15,
    "manager_id": "admin-08"
  },
  {
    "id": "park-09",
    "name": "حديقة الأحلام",
    "city": "طرابلس",
    "address": "شارع الكورنيش، طرابلس",
    "description": "تجربة ترفيهية غنية بالألعاب المائية والبرية، وسط أجواء آمنة ومرافق نظيفة على مستوى عالٍ.",
    "images": [
      "assets/images/park-3.svg"
    ],
    "phone": "0917067228",
    "hours": "10:00 ص - 10:00 م",
    "status": "مغلق مؤقتًا",
    "status_message": "المنتزه مغلق مؤقتًا بسبب أعمال الصيانة الدورية.",
    "rating": 4.5,
    "reviews_count": 631,
    "price_from": 35,
    "manager_id": "admin-09"
  },
  {
    "id": "park-10",
    "name": "منتزه الفرح",
    "city": "بنغازي",
    "address": "شارع الكورنيش، بنغازي",
    "description": "منتزه يجمع بين الإثارة والراحة، بألعاب متدرجة الصعوبة تناسب الجميع من الصغار إلى الكبار.",
    "images": [
      "assets/images/park-4.svg"
    ],
    "phone": "0915855124",
    "hours": "9:00 ص - 11:00 م",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.0,
    "reviews_count": 121,
    "price_from": 20,
    "manager_id": "admin-10"
  },
  {
    "id": "park-11",
    "name": "أرض العجائب",
    "city": "مصراتة",
    "address": "شارع الكورنيش، مصراتة",
    "description": "منتزه عائلي متكامل يجمع بين الألعاب المثيرة والمساحات الخضراء الواسعة، مثالي لقضاء يوم ممتع مع العائلة والأصدقاء.",
    "images": [
      "assets/images/park-5.svg"
    ],
    "phone": "0915663623",
    "hours": "4:00 م - 12:00 ص",
    "status": "مغلق مؤقتًا",
    "status_message": "المنتزه مغلق مؤقتًا بسبب أعمال الصيانة الدورية.",
    "rating": 4.8,
    "reviews_count": 504,
    "price_from": 30,
    "manager_id": "admin-11"
  },
  {
    "id": "park-12",
    "name": "قصر الترفيه",
    "city": "الزاوية",
    "address": "شارع الكورنيش، الزاوية",
    "description": "وجهة ترفيهية حديثة تضم ألعابًا لجميع الأعمار، ومطاعم متنوعة، ومناطق استراحة مظللة على مدار اليوم.",
    "images": [
      "assets/images/park-6.svg"
    ],
    "phone": "0916960453",
    "hours": "10:00 ص - 12:00 ص",
    "status": "مفتوح",
    "status_message": "",
    "rating": 4.6,
    "reviews_count": 254,
    "price_from": 25,
    "manager_id": "admin-12"
  }
];

const RIDES = [
  {
    "id": "ride-001",
    "park_id": "park-01",
    "name": "قطار الأشباح",
    "description": "لعبة قطار الأشباح من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "تحت الصيانة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-002",
    "park_id": "park-01",
    "name": "المرجيحة الطائرة",
    "description": "لعبة المرجيحة الطائرة من فئة إثارة، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 7,
    "height_min": 115,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-003",
    "park_id": "park-01",
    "name": "زحليقة مائية",
    "description": "لعبة زحليقة مائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-004",
    "park_id": "park-01",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "متوقفة مؤقتًا",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-005",
    "park_id": "park-01",
    "name": "الأفعوانية الخشبية",
    "description": "لعبة الأفعوانية الخشبية من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-006",
    "park_id": "park-01",
    "name": "السيارات المتصادمة",
    "description": "لعبة السيارات المتصادمة من فئة عائلية، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متاحة",
    "category": "عائلية",
    "age_min": 5,
    "height_min": 100,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-007",
    "park_id": "park-02",
    "name": "المرجيحة الطائرة",
    "description": "لعبة المرجيحة الطائرة من فئة إثارة، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 7,
    "height_min": 115,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-008",
    "park_id": "park-02",
    "name": "القطار الصغير",
    "description": "لعبة القطار الصغير من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-009",
    "park_id": "park-02",
    "name": "حصان دوار",
    "description": "لعبة حصان دوار من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-010",
    "park_id": "park-02",
    "name": "العجلة العملاقة",
    "description": "لعبة العجلة العملاقة من فئة بانورامية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متاحة",
    "category": "بانورامية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-011",
    "park_id": "park-02",
    "name": "القطار السريع",
    "description": "لعبة القطار السريع من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "متاحة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-012",
    "park_id": "park-03",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "متوقفة مؤقتًا",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-013",
    "park_id": "park-03",
    "name": "الأفعوانية الخشبية",
    "description": "لعبة الأفعوانية الخشبية من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-014",
    "park_id": "park-03",
    "name": "قطار الأشباح",
    "description": "لعبة قطار الأشباح من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متوقفة مؤقتًا",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-015",
    "park_id": "park-03",
    "name": "القطار الصغير",
    "description": "لعبة القطار الصغير من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-016",
    "park_id": "park-03",
    "name": "القطار السريع",
    "description": "لعبة القطار السريع من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-017",
    "park_id": "park-04",
    "name": "القطار السريع",
    "description": "لعبة القطار السريع من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "تحت الصيانة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-018",
    "park_id": "park-04",
    "name": "قطار الأشباح",
    "description": "لعبة قطار الأشباح من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متوقفة مؤقتًا",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-019",
    "park_id": "park-04",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "تحت الصيانة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-020",
    "park_id": "park-04",
    "name": "حصان دوار",
    "description": "لعبة حصان دوار من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-021",
    "park_id": "park-04",
    "name": "برج السقوط",
    "description": "لعبة برج السقوط من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 12,
    "height_min": 140,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-022",
    "park_id": "park-05",
    "name": "السيارات المتصادمة",
    "description": "لعبة السيارات المتصادمة من فئة عائلية، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متاحة",
    "category": "عائلية",
    "age_min": 5,
    "height_min": 100,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-023",
    "park_id": "park-05",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-024",
    "park_id": "park-05",
    "name": "القوارب المائية",
    "description": "لعبة القوارب المائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-025",
    "park_id": "park-05",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متوقفة مؤقتًا",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-026",
    "park_id": "park-05",
    "name": "العجلة العملاقة",
    "description": "لعبة العجلة العملاقة من فئة بانورامية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "تحت الصيانة",
    "category": "بانورامية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-027",
    "park_id": "park-06",
    "name": "دائري الأطفال",
    "description": "لعبة دائري الأطفال من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-028",
    "park_id": "park-06",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "تحت الصيانة",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-029",
    "park_id": "park-06",
    "name": "الأفعوانية الخشبية",
    "description": "لعبة الأفعوانية الخشبية من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-030",
    "park_id": "park-06",
    "name": "القوارب المائية",
    "description": "لعبة القوارب المائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-031",
    "park_id": "park-06",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "تحت الصيانة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-032",
    "park_id": "park-07",
    "name": "حصان دوار",
    "description": "لعبة حصان دوار من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-033",
    "park_id": "park-07",
    "name": "المرجيحة الطائرة",
    "description": "لعبة المرجيحة الطائرة من فئة إثارة، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متوقفة مؤقتًا",
    "category": "إثارة",
    "age_min": 7,
    "height_min": 115,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-034",
    "park_id": "park-07",
    "name": "القطار الصغير",
    "description": "لعبة القطار الصغير من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-035",
    "park_id": "park-07",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-036",
    "park_id": "park-07",
    "name": "برج السقوط",
    "description": "لعبة برج السقوط من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "تحت الصيانة",
    "category": "إثارة",
    "age_min": 12,
    "height_min": 140,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-037",
    "park_id": "park-07",
    "name": "دائري الأطفال",
    "description": "لعبة دائري الأطفال من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-038",
    "park_id": "park-08",
    "name": "زحليقة مائية",
    "description": "لعبة زحليقة مائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "تحت الصيانة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-039",
    "park_id": "park-08",
    "name": "المرجيحة الطائرة",
    "description": "لعبة المرجيحة الطائرة من فئة إثارة، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 7,
    "height_min": 115,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-040",
    "park_id": "park-08",
    "name": "برج السقوط",
    "description": "لعبة برج السقوط من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 12,
    "height_min": 140,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-041",
    "park_id": "park-08",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متاحة",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-042",
    "park_id": "park-08",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-043",
    "park_id": "park-09",
    "name": "الأفعوانية الخشبية",
    "description": "لعبة الأفعوانية الخشبية من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "متاحة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-044",
    "park_id": "park-09",
    "name": "القطار الصغير",
    "description": "لعبة القطار الصغير من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-045",
    "park_id": "park-09",
    "name": "القوارب المائية",
    "description": "لعبة القوارب المائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-046",
    "park_id": "park-09",
    "name": "العجلة العملاقة",
    "description": "لعبة العجلة العملاقة من فئة بانورامية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متاحة",
    "category": "بانورامية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-047",
    "park_id": "park-09",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-048",
    "park_id": "park-10",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-049",
    "park_id": "park-10",
    "name": "قطار الأشباح",
    "description": "لعبة قطار الأشباح من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-050",
    "park_id": "park-10",
    "name": "القوارب المائية",
    "description": "لعبة القوارب المائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "متوقفة مؤقتًا",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-051",
    "park_id": "park-10",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "تحت الصيانة",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-052",
    "park_id": "park-10",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-053",
    "park_id": "park-11",
    "name": "بيت الرعب",
    "description": "لعبة بيت الرعب من فئة مغامرات، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "مغامرات",
    "age_min": 10,
    "height_min": 120,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-054",
    "park_id": "park-11",
    "name": "زحليقة مائية",
    "description": "لعبة زحليقة مائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-055",
    "park_id": "park-11",
    "name": "الأفعوانية الخشبية",
    "description": "لعبة الأفعوانية الخشبية من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-056",
    "park_id": "park-11",
    "name": "دائري الأطفال",
    "description": "لعبة دائري الأطفال من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-057",
    "park_id": "park-11",
    "name": "القطار السريع",
    "description": "لعبة القطار السريع من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-2.svg",
    "status": "متوقفة مؤقتًا",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-058",
    "park_id": "park-11",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-3.svg",
    "status": "تحت الصيانة",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-059",
    "park_id": "park-12",
    "name": "السفينة الدوارة",
    "description": "لعبة السفينة الدوارة من فئة مغامرات، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-4.svg",
    "status": "تحت الصيانة",
    "category": "مغامرات",
    "age_min": 8,
    "height_min": 120,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-060",
    "park_id": "park-12",
    "name": "القطار السريع",
    "description": "لعبة القطار السريع من فئة أفعوانية، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-5.svg",
    "status": "تحت الصيانة",
    "category": "أفعوانية",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-061",
    "park_id": "park-12",
    "name": "زحليقة مائية",
    "description": "لعبة زحليقة مائية من فئة مائية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-6.svg",
    "status": "متاحة",
    "category": "مائية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-062",
    "park_id": "park-12",
    "name": "برج الدوران",
    "description": "لعبة برج الدوران من فئة إثارة، تجربة عالٍ الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-7.svg",
    "status": "تحت الصيانة",
    "category": "إثارة",
    "age_min": 10,
    "height_min": 130,
    "thrill_level": "عالٍ",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-063",
    "park_id": "park-12",
    "name": "القطار الصغير",
    "description": "لعبة القطار الصغير من فئة أطفال، تجربة خفيف الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-8.svg",
    "status": "متاحة",
    "category": "أطفال",
    "age_min": 2,
    "height_min": 0,
    "thrill_level": "خفيف",
    "last_updated": "2026-08-10"
  },
  {
    "id": "ride-064",
    "park_id": "park-12",
    "name": "العجلة العملاقة",
    "description": "لعبة العجلة العملاقة من فئة بانورامية، تجربة متوسط الإثارة مناسبة لعشاق المغامرة.",
    "image": "assets/images/ride-1.svg",
    "status": "متاحة",
    "category": "بانورامية",
    "age_min": 6,
    "height_min": 110,
    "thrill_level": "متوسط",
    "last_updated": "2026-08-10"
  }
];

const SERVICES = [
  {
    "id": "service-001",
    "park_id": "park-01",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-002",
    "park_id": "park-01",
    "name": "موقف السيارات الرئيسي",
    "type": "موقف سيارات",
    "description": "موقف سيارات يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-003",
    "park_id": "park-01",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-004",
    "park_id": "park-02",
    "name": "منطقة ألعاب الأطفال",
    "type": "ألعاب أطفال",
    "description": "ألعاب أطفال يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-005",
    "park_id": "park-02",
    "name": "مطعم الحديقة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-006",
    "park_id": "park-02",
    "name": "موقف السيارات الرئيسي",
    "type": "موقف سيارات",
    "description": "موقف سيارات يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-007",
    "park_id": "park-03",
    "name": "دورات المياه",
    "type": "أخرى",
    "description": "أخرى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-008",
    "park_id": "park-03",
    "name": "موقف السيارات الرئيسي",
    "type": "موقف سيارات",
    "description": "موقف سيارات يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-009",
    "park_id": "park-03",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-010",
    "park_id": "park-03",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-011",
    "park_id": "park-04",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-012",
    "park_id": "park-04",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-013",
    "park_id": "park-04",
    "name": "متجر التذكارات",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-014",
    "park_id": "park-04",
    "name": "موقف السيارات الرئيسي",
    "type": "موقف سيارات",
    "description": "موقف سيارات يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-015",
    "park_id": "park-05",
    "name": "كافيه الزوايا",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-016",
    "park_id": "park-05",
    "name": "مطعم الحديقة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-017",
    "park_id": "park-05",
    "name": "متجر الهدايا",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-018",
    "park_id": "park-06",
    "name": "موقف السيارات الرئيسي",
    "type": "موقف سيارات",
    "description": "موقف سيارات يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-019",
    "park_id": "park-06",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-020",
    "park_id": "park-06",
    "name": "مطعم الحديقة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-021",
    "park_id": "park-06",
    "name": "دورات المياه",
    "type": "أخرى",
    "description": "أخرى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-022",
    "park_id": "park-07",
    "name": "متجر الهدايا",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-023",
    "park_id": "park-07",
    "name": "دورات المياه",
    "type": "أخرى",
    "description": "أخرى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-024",
    "park_id": "park-07",
    "name": "مطعم الحديقة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-025",
    "park_id": "park-08",
    "name": "متجر الهدايا",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-026",
    "park_id": "park-08",
    "name": "دورات المياه",
    "type": "أخرى",
    "description": "أخرى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-027",
    "park_id": "park-08",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-028",
    "park_id": "park-09",
    "name": "دورات المياه",
    "type": "أخرى",
    "description": "أخرى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-029",
    "park_id": "park-09",
    "name": "كافيه الزوايا",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-030",
    "park_id": "park-09",
    "name": "مطعم الحديقة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-031",
    "park_id": "park-09",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-032",
    "park_id": "park-10",
    "name": "نقطة الإسعافات الأولية",
    "type": "خدمة طبية",
    "description": "خدمة طبية يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-033",
    "park_id": "park-10",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-034",
    "park_id": "park-10",
    "name": "كافيه الزوايا",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  },
  {
    "id": "service-035",
    "park_id": "park-11",
    "name": "متجر الهدايا",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-036",
    "park_id": "park-11",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-037",
    "park_id": "park-11",
    "name": "كافيه الزوايا",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-038",
    "park_id": "park-12",
    "name": "متجر التذكارات",
    "type": "متجر",
    "description": "متجر يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "مغلقة مؤقتًا"
  },
  {
    "id": "service-039",
    "park_id": "park-12",
    "name": "مطعم الواحة",
    "type": "مطعم",
    "description": "مطعم يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "في الجهة الشرقية من المنتزه",
    "status": "متاحة"
  },
  {
    "id": "service-040",
    "park_id": "park-12",
    "name": "مقهى النخيل",
    "type": "مقهى",
    "description": "مقهى يقدم خدمة متميزة داخل المنتزه لراحة الزوار.",
    "location": "بالقرب من المدخل الرئيسي",
    "status": "متاحة"
  }
];

const TICKETS = [
  {
    "id": "ticket-001",
    "park_id": "park-01",
    "name": "تذكرة دخول",
    "price": 25,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-002",
    "park_id": "park-01",
    "name": "تذكرة عائلية",
    "price": 90,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-003",
    "park_id": "park-01",
    "name": "باقة VIP",
    "price": 125,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-004",
    "park_id": "park-02",
    "name": "تذكرة دخول",
    "price": 35,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-005",
    "park_id": "park-02",
    "name": "تذكرة عائلية",
    "price": 130,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-006",
    "park_id": "park-02",
    "name": "باقة VIP",
    "price": 175,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-007",
    "park_id": "park-03",
    "name": "تذكرة دخول",
    "price": 20,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-008",
    "park_id": "park-03",
    "name": "تذكرة عائلية",
    "price": 70,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-009",
    "park_id": "park-03",
    "name": "باقة VIP",
    "price": 100,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-010",
    "park_id": "park-04",
    "name": "تذكرة دخول",
    "price": 35,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-011",
    "park_id": "park-04",
    "name": "تذكرة عائلية",
    "price": 130,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-012",
    "park_id": "park-04",
    "name": "باقة VIP",
    "price": 175,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-013",
    "park_id": "park-05",
    "name": "تذكرة دخول",
    "price": 15,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-014",
    "park_id": "park-05",
    "name": "تذكرة عائلية",
    "price": 50,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-015",
    "park_id": "park-05",
    "name": "باقة VIP",
    "price": 75,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-016",
    "park_id": "park-06",
    "name": "تذكرة دخول",
    "price": 20,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-017",
    "park_id": "park-06",
    "name": "تذكرة عائلية",
    "price": 70,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-018",
    "park_id": "park-06",
    "name": "باقة VIP",
    "price": 100,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-019",
    "park_id": "park-07",
    "name": "تذكرة دخول",
    "price": 25,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-020",
    "park_id": "park-07",
    "name": "تذكرة عائلية",
    "price": 90,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-021",
    "park_id": "park-07",
    "name": "باقة VIP",
    "price": 125,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-022",
    "park_id": "park-08",
    "name": "تذكرة دخول",
    "price": 15,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-023",
    "park_id": "park-08",
    "name": "تذكرة عائلية",
    "price": 50,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-024",
    "park_id": "park-08",
    "name": "باقة VIP",
    "price": 75,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-025",
    "park_id": "park-09",
    "name": "تذكرة دخول",
    "price": 35,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-026",
    "park_id": "park-09",
    "name": "تذكرة عائلية",
    "price": 130,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-027",
    "park_id": "park-09",
    "name": "باقة VIP",
    "price": 175,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-028",
    "park_id": "park-10",
    "name": "تذكرة دخول",
    "price": 20,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-029",
    "park_id": "park-10",
    "name": "تذكرة عائلية",
    "price": 70,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-030",
    "park_id": "park-10",
    "name": "باقة VIP",
    "price": 100,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-031",
    "park_id": "park-11",
    "name": "تذكرة دخول",
    "price": 30,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-032",
    "park_id": "park-11",
    "name": "تذكرة عائلية",
    "price": 110,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-033",
    "park_id": "park-11",
    "name": "باقة VIP",
    "price": 150,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-034",
    "park_id": "park-12",
    "name": "تذكرة دخول",
    "price": 25,
    "description": "تذكرة دخول فردية لجميع مناطق المنتزه.",
    "people_count": 1,
    "status": "متاحة"
  },
  {
    "id": "ticket-035",
    "park_id": "park-12",
    "name": "تذكرة عائلية",
    "price": 90,
    "description": "تذكرة مخصصة لعائلة من 4 أشخاص بسعر مخفض.",
    "people_count": 4,
    "status": "متاحة"
  },
  {
    "id": "ticket-036",
    "park_id": "park-12",
    "name": "باقة VIP",
    "price": 125,
    "description": "دخول مميز مع أولوية على الألعاب وجلسة استراحة خاصة.",
    "people_count": 1,
    "status": "متاحة"
  }
];

const BOOKINGS_SEED = [
  {
    "id": "PK-2026-001000",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-04",
    "park_name": "واحة الترفيه",
    "date": "2026-08-22",
    "ticket_id": "ticket-012",
    "ticket_type": "باقة VIP",
    "quantity": 3,
    "total_price": 525,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001001",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-07",
    "park_name": "منتزه النخيل",
    "date": "2026-08-29",
    "ticket_id": "ticket-019",
    "ticket_type": "تذكرة دخول",
    "quantity": 3,
    "total_price": 75,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001002",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-02",
    "park_name": "منتزه السعادة",
    "date": "2026-08-18",
    "ticket_id": "ticket-004",
    "ticket_type": "تذكرة دخول",
    "quantity": 4,
    "total_price": 140,
    "status": "مؤكد",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001003",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-09",
    "park_name": "حديقة الأحلام",
    "date": "2026-08-19",
    "ticket_id": "ticket-025",
    "ticket_type": "تذكرة دخول",
    "quantity": 3,
    "total_price": 105,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001004",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-02",
    "park_name": "منتزه السعادة",
    "date": "2026-08-24",
    "ticket_id": "ticket-004",
    "ticket_type": "تذكرة دخول",
    "quantity": 3,
    "total_price": 105,
    "status": "مستخدم",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001005",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-08",
    "park_name": "جزيرة المرح",
    "date": "2026-08-15",
    "ticket_id": "ticket-024",
    "ticket_type": "باقة VIP",
    "quantity": 3,
    "total_price": 225,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001006",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-11",
    "park_name": "أرض العجائب",
    "date": "2026-08-23",
    "ticket_id": "ticket-031",
    "ticket_type": "تذكرة دخول",
    "quantity": 2,
    "total_price": 60,
    "status": "مؤكد",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001007",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-02",
    "park_name": "منتزه السعادة",
    "date": "2026-08-23",
    "ticket_id": "ticket-006",
    "ticket_type": "باقة VIP",
    "quantity": 2,
    "total_price": 350,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001008",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-10",
    "park_name": "منتزه الفرح",
    "date": "2026-08-21",
    "ticket_id": "ticket-028",
    "ticket_type": "تذكرة دخول",
    "quantity": 3,
    "total_price": 60,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001009",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-09",
    "park_name": "حديقة الأحلام",
    "date": "2026-08-16",
    "ticket_id": "ticket-026",
    "ticket_type": "تذكرة عائلية",
    "quantity": 3,
    "total_price": 390,
    "status": "مؤكد",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001010",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-11",
    "park_name": "أرض العجائب",
    "date": "2026-08-16",
    "ticket_id": "ticket-032",
    "ticket_type": "تذكرة عائلية",
    "quantity": 3,
    "total_price": 330,
    "status": "مؤكد",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001011",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-06",
    "park_name": "عالم الألعاب",
    "date": "2026-08-20",
    "ticket_id": "ticket-016",
    "ticket_type": "تذكرة دخول",
    "quantity": 3,
    "total_price": 60,
    "status": "منتهي",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001012",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-09",
    "park_name": "حديقة الأحلام",
    "date": "2026-08-15",
    "ticket_id": "ticket-027",
    "ticket_type": "باقة VIP",
    "quantity": 4,
    "total_price": 700,
    "status": "مؤكد",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001013",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-02",
    "park_name": "منتزه السعادة",
    "date": "2026-08-16",
    "ticket_id": "ticket-006",
    "ticket_type": "باقة VIP",
    "quantity": 2,
    "total_price": 350,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001014",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-10",
    "park_name": "منتزه الفرح",
    "date": "2026-08-28",
    "ticket_id": "ticket-030",
    "ticket_type": "باقة VIP",
    "quantity": 2,
    "total_price": 200,
    "status": "مستخدم",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001015",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-01",
    "park_name": "عالم المرح",
    "date": "2026-08-16",
    "ticket_id": "ticket-002",
    "ticket_type": "تذكرة عائلية",
    "quantity": 3,
    "total_price": 270,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001016",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-04",
    "park_name": "واحة الترفيه",
    "date": "2026-08-18",
    "ticket_id": "ticket-012",
    "ticket_type": "باقة VIP",
    "quantity": 2,
    "total_price": 350,
    "status": "ملغى",
    "created_at": "2026-08-01"
  },
  {
    "id": "PK-2026-001017",
    "user_email": "visitor@example.com",
    "user_name": "أحمد الزائر",
    "park_id": "park-09",
    "park_name": "حديقة الأحلام",
    "date": "2026-08-22",
    "ticket_id": "ticket-026",
    "ticket_type": "تذكرة عائلية",
    "quantity": 2,
    "total_price": 260,
    "status": "مستخدم",
    "created_at": "2026-08-01"
  }
];

const USERS_SEED = [
  {
    "id": "user-01",
    "name": "أحمد الزائر",
    "email": "visitor@example.com",
    "phone": "0911234567",
    "password": "123456"
  }
];

const ADMINS_SEED = {
  "park_admins": [
    {
      "id": "admin-01",
      "name": "مدير عالم المرح",
      "email": "admin@funworld.demo",
      "password": "123456",
      "park_id": "park-01",
      "status": "نشط"
    },
    {
      "id": "admin-02",
      "name": "مدير منتزه السعادة",
      "email": "admin2@parks.demo",
      "password": "123456",
      "park_id": "park-02",
      "status": "نشط"
    },
    {
      "id": "admin-03",
      "name": "مدير جنة الأطفال",
      "email": "admin3@parks.demo",
      "password": "123456",
      "park_id": "park-03",
      "status": "نشط"
    },
    {
      "id": "admin-04",
      "name": "مدير واحة الترفيه",
      "email": "admin4@parks.demo",
      "password": "123456",
      "park_id": "park-04",
      "status": "نشط"
    },
    {
      "id": "admin-05",
      "name": "مدير مدينة المغامرات",
      "email": "admin5@parks.demo",
      "password": "123456",
      "park_id": "park-05",
      "status": "نشط"
    },
    {
      "id": "admin-06",
      "name": "مدير عالم الألعاب",
      "email": "admin6@parks.demo",
      "password": "123456",
      "park_id": "park-06",
      "status": "نشط"
    },
    {
      "id": "admin-07",
      "name": "مدير منتزه النخيل",
      "email": "admin7@parks.demo",
      "password": "123456",
      "park_id": "park-07",
      "status": "نشط"
    },
    {
      "id": "admin-08",
      "name": "مدير جزيرة المرح",
      "email": "admin8@parks.demo",
      "password": "123456",
      "park_id": "park-08",
      "status": "نشط"
    },
    {
      "id": "admin-09",
      "name": "مدير حديقة الأحلام",
      "email": "admin9@parks.demo",
      "password": "123456",
      "park_id": "park-09",
      "status": "نشط"
    },
    {
      "id": "admin-10",
      "name": "مدير منتزه الفرح",
      "email": "admin10@parks.demo",
      "password": "123456",
      "park_id": "park-10",
      "status": "نشط"
    },
    {
      "id": "admin-11",
      "name": "مدير أرض العجائب",
      "email": "admin11@parks.demo",
      "password": "123456",
      "park_id": "park-11",
      "status": "نشط"
    },
    {
      "id": "admin-12",
      "name": "مدير قصر الترفيه",
      "email": "admin12@parks.demo",
      "password": "123456",
      "park_id": "park-12",
      "status": "نشط"
    }
  ],
  "super_admins": [
    {
      "id": "sadmin-01",
      "name": "مدير المنصة",
      "email": "superadmin@platform.demo",
      "password": "123456"
    }
  ]
};

window.PARKS_PLATFORM_DATA = {
  parks: PARKS,
  rides: RIDES,
  services: SERVICES,
  tickets: TICKETS,
  bookingsSeed: BOOKINGS_SEED,
  usersSeed: USERS_SEED,
  adminsSeed: ADMINS_SEED
};