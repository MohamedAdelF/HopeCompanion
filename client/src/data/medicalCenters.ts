export interface MedicalCenter {
  id: string;
  name: string;
  type: "clinic" | "hospital";
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  specialties?: string[];
}

export const medicalCenters: MedicalCenter[] = [
  // ========== القاهرة ==========
  {
    id: "1",
    name: "مستشفى سرطان الثدي - المركز الطبي الدولي",
    type: "hospital",
    address: "شارع عمر المختار، مصر الجديدة، القاهرة",
    phone: "+20224187888",
    latitude: 30.0875,
    longitude: 31.3186,
    city: "القاهرة",
    country: "مصر",
    specialties: ["أورام الثدي", "جراحة الثدي", "علاج سرطان الثدي"]
  },
  {
    id: "2",
    name: "مستشفى 57357 لعلاج أورام الأطفال والكبار",
    type: "hospital",
    address: "شارع 15 مايو، مدينة نصر، القاهرة",
    phone: "+20225389888",
    latitude: 30.0626,
    longitude: 31.3197,
    city: "القاهرة",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان", "الكيمياء العلاجية"]
  },
  {
    id: "3",
    name: "المعهد القومي للأورام",
    type: "hospital",
    address: "شارع قصر العيني، القاهرة",
    phone: "+20223654264",
    latitude: 30.0301,
    longitude: 31.2295,
    city: "القاهرة",
    country: "مصر",
    specialties: ["أورام الثدي", "أبحاث السرطان", "علاج متقدم"]
  },
  {
    id: "4",
    name: "عيادة أورام الثدي المتخصصة - د. منى حمدي",
    type: "clinic",
    address: "شارع أحمد فؤاد، مصر الجديدة، القاهرة",
    phone: "+201223456789",
    latitude: 30.0912,
    longitude: 31.3245,
    city: "القاهرة",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي", "جراحة تجميلية"]
  },
  {
    id: "5",
    name: "عيادة صحة المرأة - د. هدى محمد",
    type: "clinic",
    address: "شارع الزقازيق، العباسية، القاهرة",
    phone: "+201234567890",
    latitude: 30.0689,
    longitude: 31.2801,
    city: "القاهرة",
    country: "مصر",
    specialties: ["كشف دوري للثدي", "متابعة ما بعد العلاج"]
  },
  {
    id: "6",
    name: "مستشفى عين شمس التخصصي",
    type: "hospital",
    address: "شارع رمسيس، العباسية، القاهرة",
    phone: "+20224828282",
    latitude: 30.0733,
    longitude: 31.2727,
    city: "القاهرة",
    country: "مصر",
    specialties: ["أورام الثدي", "جراحة الأورام"]
  },
  {
    id: "7",
    name: "مستشفى النيل بدراوي",
    type: "hospital",
    address: "مدينة نصر، القاهرة",
    phone: "+20222740800",
    latitude: 30.0549,
    longitude: 31.3132,
    city: "القاهرة",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "8",
    name: "عيادة أورام الثدي - د. سامية أحمد",
    type: "clinic",
    address: "شارع النصر، المعادي، القاهرة",
    phone: "+201012345678",
    latitude: 29.9584,
    longitude: 31.2874,
    city: "القاهرة",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== الجيزة ==========
  {
    id: "9",
    name: "مستشفى سرطان الثدي - الجامعة الأمريكية",
    type: "hospital",
    address: "الكورنيش، الزمالك، الجيزة",
    phone: "+20227955255",
    latitude: 30.0604,
    longitude: 31.2195,
    city: "الجيزة",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج متقدم"]
  },
  {
    id: "10",
    name: "مستشفى دار الفؤاد",
    type: "hospital",
    address: "شارع الهرم، الجيزة",
    phone: "+20235867670",
    latitude: 29.9761,
    longitude: 31.1332,
    city: "الجيزة",
    country: "مصر",
    specialties: ["أورام الثدي", "جراحة الأورام"]
  },
  {
    id: "11",
    name: "عيادة صحة المرأة - د. فاطمة الزهراء",
    type: "clinic",
    address: "شارع الأهرام، الدقي، الجيزة",
    phone: "+201098765432",
    latitude: 30.0433,
    longitude: 31.2135,
    city: "الجيزة",
    country: "مصر",
    specialties: ["كشف دوري للثدي", "متابعة صحية"]
  },
  
  // ========== الإسكندرية ==========
  {
    id: "12",
    name: "مستشفى الشاطبي التخصصي",
    type: "hospital",
    address: "شارع الشاطبي، الإسكندرية",
    phone: "+2035866433",
    latitude: 31.2001,
    longitude: 29.9187,
    city: "الإسكندرية",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "13",
    name: "مستشفى الأمل للسرطان",
    type: "hospital",
    address: "شارع أبو قير، الإسكندرية",
    phone: "+2035901234",
    latitude: 31.2696,
    longitude: 30.0281,
    city: "الإسكندرية",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "14",
    name: "عيادة أورام الثدي - د. إيناس أحمد",
    type: "clinic",
    address: "شارع سيدي بشر، الإسكندرية",
    phone: "+201112345678",
    latitude: 31.2614,
    longitude: 29.9705,
    city: "الإسكندرية",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  {
    id: "15",
    name: "مستشفى العامرية",
    type: "hospital",
    address: "شارع مصطفى كامل، الإسكندرية",
    phone: "+2035432109",
    latitude: 31.2052,
    longitude: 29.9056,
    city: "الإسكندرية",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  
  // ========== الدقهلية (المنصورة) ==========
  {
    id: "16",
    name: "مستشفى المنصورة الدولي",
    type: "hospital",
    address: "شارع الجلاء، المنصورة",
    phone: "+20502235456",
    latitude: 31.0416,
    longitude: 31.3800,
    city: "المنصورة",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "17",
    name: "مستشفى جامعة المنصورة",
    type: "hospital",
    address: "شارع الجمهورية، المنصورة",
    phone: "+20502234242",
    latitude: 31.0381,
    longitude: 31.3658,
    city: "المنصورة",
    country: "مصر",
    specialties: ["أورام الثدي", "جراحة الأورام"]
  },
  {
    id: "18",
    name: "عيادة أورام الثدي - د. مريم سعيد",
    type: "clinic",
    address: "شارع النصر، المنصورة",
    phone: "+201055555555",
    latitude: 31.0401,
    longitude: 31.3700,
    city: "المنصورة",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== الغربية (طنطا) ==========
  {
    id: "19",
    name: "مستشفى طنطا التخصصي",
    type: "hospital",
    address: "شارع سعد زغلول، طنطا",
    phone: "+20403345000",
    latitude: 30.7892,
    longitude: 31.0041,
    city: "طنطا",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "20",
    name: "مستشفى الأورام بطنطا",
    type: "hospital",
    address: "شارع الجيش، طنطا",
    phone: "+20403345678",
    latitude: 30.7850,
    longitude: 31.0000,
    city: "طنطا",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج متقدم"]
  },
  {
    id: "21",
    name: "عيادة صحة المرأة - د. رشا محمود",
    type: "clinic",
    address: "شارع المحطة، طنطا",
    phone: "+201011111111",
    latitude: 30.7900,
    longitude: 31.0050,
    city: "طنطا",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== أسيوط ==========
  {
    id: "22",
    name: "مستشفى أسيوط الجامعي",
    type: "hospital",
    address: "شارع جامعة الأزهر، أسيوط",
    phone: "+20882323456",
    latitude: 27.1783,
    longitude: 31.1859,
    city: "أسيوط",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "23",
    name: "مستشفى الصفا التخصصي",
    type: "hospital",
    address: "شارع الجيش، أسيوط",
    phone: "+20882324567",
    latitude: 27.1820,
    longitude: 31.1900,
    city: "أسيوط",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "24",
    name: "عيادة أورام الثدي - د. نورا علي",
    type: "clinic",
    address: "شارع الثورة، أسيوط",
    phone: "+201077777777",
    latitude: 27.1800,
    longitude: 31.1870,
    city: "أسيوط",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== أسوان ==========
  {
    id: "25",
    name: "مستشفى أسوان الجامعي",
    type: "hospital",
    address: "شارع الكورنيش، أسوان",
    phone: "+20972345678",
    latitude: 24.0889,
    longitude: 32.8998,
    city: "أسوان",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "26",
    name: "مستشفى أسوان التخصصي",
    type: "hospital",
    address: "شارع خالد بن الوليد، أسوان",
    phone: "+20972346789",
    latitude: 24.0900,
    longitude: 32.9000,
    city: "أسوان",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  
  // ========== الأقصر ==========
  {
    id: "27",
    name: "مستشفى الأقصر الدولي",
    type: "hospital",
    address: "شارع الكورنيش، الأقصر",
    phone: "+20952345678",
    latitude: 25.6969,
    longitude: 32.6422,
    city: "الأقصر",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "28",
    name: "عيادة أورام الثدي - د. سارة محمد",
    type: "clinic",
    address: "شارع السلام، الأقصر",
    phone: "+201066666666",
    latitude: 25.6980,
    longitude: 32.6430,
    city: "الأقصر",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== قنا ==========
  {
    id: "29",
    name: "مستشفى قنا التخصصي",
    type: "hospital",
    address: "شارع الجامعة، قنا",
    phone: "+20962345678",
    latitude: 26.1644,
    longitude: 32.7267,
    city: "قنا",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "30",
    name: "عيادة صحة المرأة - د. ياسمين حسن",
    type: "clinic",
    address: "شارع النصر، قنا",
    phone: "+201044444444",
    latitude: 26.1650,
    longitude: 32.7270,
    city: "قنا",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== السويس ==========
  {
    id: "31",
    name: "مستشفى السويس التخصصي",
    type: "hospital",
    address: "شارع الجيش، السويس",
    phone: "+20623456789",
    latitude: 29.9668,
    longitude: 32.5498,
    city: "السويس",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "32",
    name: "عيادة أورام الثدي - د. منى إبراهيم",
    type: "clinic",
    address: "شارع الشهداء، السويس",
    phone: "+201022222222",
    latitude: 29.9680,
    longitude: 32.5500,
    city: "السويس",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== الإسماعيلية ==========
  {
    id: "33",
    name: "مستشفى الإسماعيلية العام",
    type: "hospital",
    address: "شارع صلاح سالم، الإسماعيلية",
    phone: "+20643234567",
    latitude: 30.5965,
    longitude: 32.2720,
    city: "الإسماعيلية",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "34",
    name: "عيادة صحة المرأة - د. ليلى أحمد",
    type: "clinic",
    address: "شارع الحرية، الإسماعيلية",
    phone: "+201033333333",
    latitude: 30.5970,
    longitude: 32.2730,
    city: "الإسماعيلية",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== بورسعيد ==========
  {
    id: "35",
    name: "مستشفى بورسعيد التخصصي",
    type: "hospital",
    address: "شارع الجيش، بورسعيد",
    phone: "+20662345678",
    latitude: 31.2653,
    longitude: 32.3019,
    city: "بورسعيد",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "36",
    name: "عيادة أورام الثدي - د. هبة علي",
    type: "clinic",
    address: "شارع 23 يوليو، بورسعيد",
    phone: "+201099999999",
    latitude: 31.2660,
    longitude: 32.3020,
    city: "بورسعيد",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== الشرقية (الزقازيق) ==========
  {
    id: "37",
    name: "مستشفى الزقازيق الجامعي",
    type: "hospital",
    address: "شارع جامعة الزقازيق، الزقازيق",
    phone: "+20552345678",
    latitude: 30.5876,
    longitude: 31.5020,
    city: "الزقازيق",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "38",
    name: "مستشفى الصدر التخصصي",
    type: "hospital",
    address: "شارع الجيش، الزقازيق",
    phone: "+20552346789",
    latitude: 30.5880,
    longitude: 31.5030,
    city: "الزقازيق",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "39",
    name: "عيادة أورام الثدي - د. أمنية خالد",
    type: "clinic",
    address: "شارع النصر، الزقازيق",
    phone: "+201088888888",
    latitude: 30.5890,
    longitude: 31.5040,
    city: "الزقازيق",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== القليوبية (بنها) ==========
  {
    id: "40",
    name: "مستشفى بنها الجامعي",
    type: "hospital",
    address: "شارع الجامعة، بنها",
    phone: "+20541323456",
    latitude: 30.4693,
    longitude: 31.1836,
    city: "بنها",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "41",
    name: "عيادة صحة المرأة - د. دعاء محسن",
    type: "clinic",
    address: "شارع الكورنيش، بنها",
    phone: "+201012345678",
    latitude: 30.4700,
    longitude: 31.1840,
    city: "بنها",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== دمياط ==========
  {
    id: "42",
    name: "مستشفى دمياط التخصصي",
    type: "hospital",
    address: "شارع الجيش، دمياط",
    phone: "+20573234567",
    latitude: 31.4205,
    longitude: 31.8124,
    city: "دمياط",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "43",
    name: "عيادة أورام الثدي - د. سميرة عبدالله",
    type: "clinic",
    address: "شارع النصر، دمياط",
    phone: "+201055566677",
    latitude: 31.4210,
    longitude: 31.8130,
    city: "دمياط",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== المنيا ==========
  {
    id: "44",
    name: "مستشفى المنيا الجامعي",
    type: "hospital",
    address: "شارع جامعة المنيا، المنيا",
    phone: "+20862345678",
    latitude: 28.1098,
    longitude: 30.7414,
    city: "المنيا",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "45",
    name: "عيادة أورام الثدي - د. رانيا فؤاد",
    type: "clinic",
    address: "شارع الثورة، المنيا",
    phone: "+201045678901",
    latitude: 28.1100,
    longitude: 30.7420,
    city: "المنيا",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== بني سويف ==========
  {
    id: "46",
    name: "مستشفى بني سويف التخصصي",
    type: "hospital",
    address: "شارع النصر، بني سويف",
    phone: "+20822345678",
    latitude: 29.0744,
    longitude: 31.0972,
    city: "بني سويف",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "47",
    name: "عيادة صحة المرأة - د. فاطمة محمود",
    type: "clinic",
    address: "شارع الجيش، بني سويف",
    phone: "+201056789012",
    latitude: 29.0750,
    longitude: 31.0980,
    city: "بني سويف",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== الفيوم ==========
  {
    id: "48",
    name: "مستشفى الفيوم التخصصي",
    type: "hospital",
    address: "شارع جامعة الفيوم، الفيوم",
    phone: "+20842345678",
    latitude: 29.3094,
    longitude: 30.8425,
    city: "الفيوم",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "49",
    name: "عيادة أورام الثدي - د. أمل سعد",
    type: "clinic",
    address: "شارع النصر، الفيوم",
    phone: "+201067890123",
    latitude: 29.3100,
    longitude: 30.8430,
    city: "الفيوم",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== سوهاج ==========
  {
    id: "50",
    name: "مستشفى سوهاج الجامعي",
    type: "hospital",
    address: "شارع الجامعة، سوهاج",
    phone: "+20932345678",
    latitude: 26.5590,
    longitude: 31.6941,
    city: "سوهاج",
    country: "مصر",
    specialties: ["أورام الثدي", "علاج السرطان"]
  },
  {
    id: "51",
    name: "عيادة أورام الثدي - د. إيمان رشاد",
    type: "clinic",
    address: "شارع الجيش، سوهاج",
    phone: "+201078901234",
    latitude: 26.5600,
    longitude: 31.6950,
    city: "سوهاج",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== كفر الشيخ ==========
  {
    id: "52",
    name: "مستشفى كفر الشيخ التخصصي",
    type: "hospital",
    address: "شارع النصر، كفر الشيخ",
    phone: "+20472345678",
    latitude: 31.1117,
    longitude: 30.9397,
    city: "كفر الشيخ",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "53",
    name: "عيادة صحة المرأة - د. شيماء عادل",
    type: "clinic",
    address: "شارع الجيش، كفر الشيخ",
    phone: "+201089012345",
    latitude: 31.1120,
    longitude: 30.9400,
    city: "كفر الشيخ",
    country: "مصر",
    specialties: ["كشف دوري للثدي"]
  },
  
  // ========== البحيرة (دمنهور) ==========
  {
    id: "54",
    name: "مستشفى دمنهور التخصصي",
    type: "hospital",
    address: "شارع الجيش، دمنهور",
    phone: "+20453345678",
    latitude: 31.0423,
    longitude: 30.4693,
    city: "دمنهور",
    country: "مصر",
    specialties: ["أورام الثدي"]
  },
  {
    id: "55",
    name: "عيادة أورام الثدي - د. نسرين حسن",
    type: "clinic",
    address: "شارع النصر، دمنهور",
    phone: "+201090123456",
    latitude: 31.0430,
    longitude: 30.4700,
    city: "دمنهور",
    country: "مصر",
    specialties: ["كشف وعلاج أورام الثدي"]
  },
  
  // ========== الإسكندرية (محافظات إضافية) ==========
  {
    id: "56",
    name: "مستشفى المعمورة",
    type: "hospital",
    address: "شارع مصطفى النحاس، الإسكندرية",
    phone: "+2035434567",
    latitude: 31.2185,
    longitude: 29.9425,
    city: "الإسكندرية",
    country: "مصر",
    specialties: ["أورام الثدي"]
  }
];