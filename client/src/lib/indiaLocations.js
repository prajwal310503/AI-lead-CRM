// ─── India Locations Database ─────────────────────────────────────────────────
// Comprehensive list of Indian cities, localities, suburbs, and areas
// Used for instant, offline, Google Maps-like location suggestions
// Format: { name, city, state, type }
// type: 'Locality' | 'Suburb' | 'City' | 'Town' | 'Village' | 'District'

export const INDIA_LOCATIONS = [
  // ══════════════════════════════════════════════════════════
  // NAVI MUMBAI — All Nodes & Sectors
  // ══════════════════════════════════════════════════════════
  { name: 'Kamothe',             city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar',            city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Karanjade',           city: 'Panvel',      state: 'Maharashtra', type: 'Locality' },
  { name: 'CBD Belapur',         city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Belapur',             city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Nerul',               city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Vashi',               city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Sanpada',             city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Ghansoli',            city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Mahape',              city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Rabale',              city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Airoli',              city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Turbhe',              city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kopar Khairane',      city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Seawoods',            city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Ulwe',                city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Dronagiri',           city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Taloja',              city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kalamboli',           city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Khanda Colony',       city: 'Panvel',      state: 'Maharashtra', type: 'Locality' },
  { name: 'New Panvel',          city: 'Panvel',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Old Panvel',          city: 'Panvel',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Panvel',              city: 'Raigad',      state: 'Maharashtra', type: 'City'     },
  { name: 'Roadpali',            city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Pushpak Nagar',       city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Palm Beach Road',     city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Juinagar',            city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 1',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 2',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 3',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 4',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 5',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 6',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 7',   city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 10',  city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 12',  city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharghar Sector 15',  city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 1',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 2',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 4',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 5',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 6',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Kamothe Sector 7',    city: 'Navi Mumbai', state: 'Maharashtra', type: 'Locality' },
  { name: 'Navi Mumbai',         city: 'Navi Mumbai', state: 'Maharashtra', type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // MUMBAI — All Localities
  // ══════════════════════════════════════════════════════════
  { name: 'Mumbai',              city: 'Mumbai',      state: 'Maharashtra', type: 'City'     },
  { name: 'Bandra',              city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Bandra West',         city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Bandra East',         city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Andheri',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Andheri West',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Andheri East',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Borivali',            city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Borivali West',       city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Borivali East',       city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Malad',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Malad West',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Malad East',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kandivali',           city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kandivali West',      city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kandivali East',      city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Goregaon',            city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Goregaon West',       city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Goregaon East',       city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Jogeshwari',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Vile Parle',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Vile Parle West',     city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Vile Parle East',     city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Santacruz',           city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Santacruz West',      city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Santacruz East',      city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Khar',                city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Dadar',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Prabhadevi',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Worli',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Lower Parel',         city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Elphinstone Road',    city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Mahalaxmi',           city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Grant Road',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Marine Lines',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Colaba',              city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Fort',                city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Nariman Point',       city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Cuffe Parade',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Chembur',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Ghatkopar',           city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Vikhroli',            city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Bhandup',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Mulund',              city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kurla',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Sion',                city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Dharavi',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Matunga',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Wadala',              city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Sewri',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Mazgaon',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Dongri',              city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Malabar Hill',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Breach Candy',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Bhuleshwar',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Juhu',                city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Versova',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'MIDC Andheri',        city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Powai',               city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kanjurmarg',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Chandivali',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Sakinaka',            city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kurla West',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Kurla East',          city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Mankhurd',            city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Govandi',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Trombay',             city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'BKC',                 city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },
  { name: 'Bandra Kurla Complex',city: 'Mumbai',      state: 'Maharashtra', type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // THANE DISTRICT
  // ══════════════════════════════════════════════════════════
  { name: 'Thane',               city: 'Thane',       state: 'Maharashtra', type: 'City'     },
  { name: 'Thane West',          city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Thane East',          city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Dombivli',            city: 'Thane',       state: 'Maharashtra', type: 'City'     },
  { name: 'Dombivli East',       city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Dombivli West',       city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Kalyan',              city: 'Thane',       state: 'Maharashtra', type: 'City'     },
  { name: 'Kalyan West',         city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Kalyan East',         city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Ulhasnagar',          city: 'Thane',       state: 'Maharashtra', type: 'City'     },
  { name: 'Ambernath',           city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Badlapur',            city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Mira Road',           city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Bhayander',           city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Vasai',               city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Virar',               city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Nalasopara',          city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Ghodbunder Road',     city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Majiwada',            city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Manpada',             city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Balkum',              city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Vartak Nagar',        city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Wagle Estate',        city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Kopri',               city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Khopat',              city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Naupada',             city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Mumbra',              city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Diva',                city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Shil Phata',          city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Palava City',         city: 'Thane',       state: 'Maharashtra', type: 'Locality' },
  { name: 'Titwala',             city: 'Thane',       state: 'Maharashtra', type: 'Town'     },
  { name: 'Shahad',              city: 'Thane',       state: 'Maharashtra', type: 'Town'     },

  // ══════════════════════════════════════════════════════════
  // PUNE
  // ══════════════════════════════════════════════════════════
  { name: 'Pune',                city: 'Pune',        state: 'Maharashtra', type: 'City'     },
  { name: 'Shivajinagar',        city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Kothrud',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Deccan',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Aundh',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Baner',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Hinjewadi',           city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Wakad',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pimple Saudagar',     city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pimple Nilakh',       city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Vishrantwadi',        city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Viman Nagar',         city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Kalyani Nagar',       city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Koregaon Park',       city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Camp',                city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Hadapsar',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Swargate',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Katraj',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Kondhwa',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Wanowrie',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Undri',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pisoli',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Mundhwa',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Kharadi',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Wagholi',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Lohegaon',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Dhanori',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Yerawada',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Kasar Wadavali',      city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pashan',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Sus',                 city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Bavdhan',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Warje',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Ambegaon',            city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Dhayari',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pimple Gurav',        city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Ravet',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Tathawade',           city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Chakan',              city: 'Pune',        state: 'Maharashtra', type: 'Town'     },
  { name: 'Talegaon',            city: 'Pune',        state: 'Maharashtra', type: 'Town'     },
  { name: 'Chinchwad',           city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Pimpri',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Akurdi',              city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Bhosari',             city: 'Pune',        state: 'Maharashtra', type: 'Locality' },
  { name: 'Nigdi',               city: 'Pune',        state: 'Maharashtra', type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // OTHER MAHARASHTRA CITIES
  // ══════════════════════════════════════════════════════════
  { name: 'Nagpur',              city: 'Nagpur',      state: 'Maharashtra', type: 'City'     },
  { name: 'Nashik',              city: 'Nashik',      state: 'Maharashtra', type: 'City'     },
  { name: 'Aurangabad',          city: 'Aurangabad',  state: 'Maharashtra', type: 'City'     },
  { name: 'Chhatrapati Sambhajinagar', city: 'Aurangabad', state: 'Maharashtra', type: 'City' },
  { name: 'Kolhapur',            city: 'Kolhapur',    state: 'Maharashtra', type: 'City'     },
  { name: 'Solapur',             city: 'Solapur',     state: 'Maharashtra', type: 'City'     },
  { name: 'Amravati',            city: 'Amravati',    state: 'Maharashtra', type: 'City'     },
  { name: 'Sangli',              city: 'Sangli',      state: 'Maharashtra', type: 'City'     },
  { name: 'Satara',              city: 'Satara',      state: 'Maharashtra', type: 'City'     },
  { name: 'Latur',               city: 'Latur',       state: 'Maharashtra', type: 'City'     },
  { name: 'Dhule',               city: 'Dhule',       state: 'Maharashtra', type: 'City'     },
  { name: 'Jalgaon',             city: 'Jalgaon',     state: 'Maharashtra', type: 'City'     },
  { name: 'Ahmednagar',          city: 'Ahmednagar',  state: 'Maharashtra', type: 'City'     },
  { name: 'Raigad',              city: 'Raigad',      state: 'Maharashtra', type: 'District' },
  { name: 'Alibag',              city: 'Raigad',      state: 'Maharashtra', type: 'Town'     },
  { name: 'Uran',                city: 'Raigad',      state: 'Maharashtra', type: 'Town'     },
  { name: 'Khopoli',             city: 'Raigad',      state: 'Maharashtra', type: 'Town'     },
  { name: 'Pen',                 city: 'Raigad',      state: 'Maharashtra', type: 'Town'     },

  // ══════════════════════════════════════════════════════════
  // DELHI / NCR
  // ══════════════════════════════════════════════════════════
  { name: 'Delhi',               city: 'Delhi',       state: 'Delhi',       type: 'City'     },
  { name: 'New Delhi',           city: 'Delhi',       state: 'Delhi',       type: 'City'     },
  { name: 'Connaught Place',     city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Karol Bagh',          city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Lajpat Nagar',        city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Greater Kailash',     city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Vasant Kunj',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Vasant Vihar',        city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Saket',               city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Malviya Nagar',       city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Hauz Khas',           city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Green Park',          city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'South Extension',     city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Defence Colony',      city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Nehru Place',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Okhla',               city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Dwarka',              city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Janakpuri',           city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Rohini',              city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Pitampura',           city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Preet Vihar',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Laxmi Nagar',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Shahdara',            city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Mayur Vihar',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Patparganj',          city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'East Delhi',          city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'West Delhi',          city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'North Delhi',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'South Delhi',         city: 'Delhi',       state: 'Delhi',       type: 'Locality' },
  { name: 'Noida',               city: 'Noida',       state: 'Uttar Pradesh', type: 'City'   },
  { name: 'Noida Sector 18',     city: 'Noida',       state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Noida Sector 62',     city: 'Noida',       state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Greater Noida',       city: 'Greater Noida', state: 'Uttar Pradesh', type: 'City' },
  { name: 'Gurgaon',             city: 'Gurgaon',     state: 'Haryana',     type: 'City'     },
  { name: 'Gurugram',            city: 'Gurgaon',     state: 'Haryana',     type: 'City'     },
  { name: 'DLF Cyber City',      city: 'Gurgaon',     state: 'Haryana',     type: 'Locality' },
  { name: 'Golf Course Road',    city: 'Gurgaon',     state: 'Haryana',     type: 'Locality' },
  { name: 'MG Road Gurgaon',     city: 'Gurgaon',     state: 'Haryana',     type: 'Locality' },
  { name: 'Sohna Road',          city: 'Gurgaon',     state: 'Haryana',     type: 'Locality' },
  { name: 'Faridabad',           city: 'Faridabad',   state: 'Haryana',     type: 'City'     },
  { name: 'Ghaziabad',           city: 'Ghaziabad',   state: 'Uttar Pradesh', type: 'City'   },
  { name: 'Indirapuram',         city: 'Ghaziabad',   state: 'Uttar Pradesh', type: 'Locality'},

  // ══════════════════════════════════════════════════════════
  // BANGALORE / BENGALURU
  // ══════════════════════════════════════════════════════════
  { name: 'Bangalore',           city: 'Bangalore',   state: 'Karnataka',   type: 'City'     },
  { name: 'Bengaluru',           city: 'Bangalore',   state: 'Karnataka',   type: 'City'     },
  { name: 'Koramangala',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Indiranagar',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'HSR Layout',          city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'BTM Layout',          city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Electronic City',     city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Whitefield',          city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Marathahalli',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Bellandur',           city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Sarjapur Road',       city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Bannerghatta Road',   city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'JP Nagar',            city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Jayanagar',           city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Malleswaram',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Rajajinagar',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Yeshwanthpur',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Hebbal',              city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Yelahanka',           city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Ulsoor',              city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'MG Road',             city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Brigade Road',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Cunningham Road',     city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Frazer Town',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Benson Town',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Lavelle Road',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Richmond Road',       city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Domlur',              city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Old Airport Road',    city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Kadugodi',            city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Hoodi',               city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'KR Puram',            city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Banashankari',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Padmanabhanagar',     city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Basavanagudi',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Vijayanagar',         city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Kengeri',             city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },
  { name: 'Bommanahalli',        city: 'Bangalore',   state: 'Karnataka',   type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // HYDERABAD / SECUNDERABAD
  // ══════════════════════════════════════════════════════════
  { name: 'Hyderabad',           city: 'Hyderabad',   state: 'Telangana',   type: 'City'     },
  { name: 'Secunderabad',        city: 'Hyderabad',   state: 'Telangana',   type: 'City'     },
  { name: 'Banjara Hills',       city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Jubilee Hills',       city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Madhapur',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'HITEC City',          city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Gachibowli',          city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Kondapur',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Manikonda',           city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Tolichowki',          city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Mehdipatnam',         city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Ameerpet',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Begumpet',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Kukatpally',          city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'LB Nagar',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Dilsukhnagar',        city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Uppal',               city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Kompally',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Miyapur',             city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Bachupally',          city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Nizampet',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Pragathi Nagar',      city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'SR Nagar',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Srinagar Colony',     city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Attapur',             city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Narsingi',            city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Kokapet',             city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },
  { name: 'Financial District',  city: 'Hyderabad',   state: 'Telangana',   type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // CHENNAI
  // ══════════════════════════════════════════════════════════
  { name: 'Chennai',             city: 'Chennai',     state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Anna Nagar',          city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Adyar',               city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Velachery',           city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'OMR',                 city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Perungudi',           city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Sholinganallur',      city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Chrompet',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Porur',               city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Nungambakkam',        city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'T. Nagar',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Mylapore',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Kilpauk',             city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Kodambakkam',         city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Saidapet',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Ambattur',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Avadi',               city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Perambur',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Tondiarpet',          city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Egmore',              city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Triplicane',          city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Royapettah',          city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Alwarpet',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Mandaveli',           city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Besant Nagar',        city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Thiruvanmiyur',       city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Pallikaranai',        city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Medavakkam',          city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },
  { name: 'Tambaram',            city: 'Chennai',     state: 'Tamil Nadu',  type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // KOLKATA
  // ══════════════════════════════════════════════════════════
  { name: 'Kolkata',             city: 'Kolkata',     state: 'West Bengal', type: 'City'     },
  { name: 'Salt Lake City',      city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'New Town',            city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Rajarhat',            city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Park Street',         city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Esplanade',           city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Gariahat',            city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Ballygunge',          city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Alipore',             city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Tollygunge',          city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Behala',              city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Jadavpur',            city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Dum Dum',             city: 'Kolkata',     state: 'West Bengal', type: 'Locality' },
  { name: 'Howrah',              city: 'Howrah',      state: 'West Bengal', type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // AHMEDABAD / GUJARAT
  // ══════════════════════════════════════════════════════════
  { name: 'Ahmedabad',           city: 'Ahmedabad',   state: 'Gujarat',     type: 'City'     },
  { name: 'Satellite',           city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Prahlad Nagar',       city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Vastrapur',           city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Navrangpura',         city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'CG Road',             city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Bodakdev',            city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Thaltej',             city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Gota',                city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Bopal',               city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'South Bopal',         city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Chandkheda',          city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Motera',              city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Ranip',               city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Maninagar',           city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Naroda',              city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Nikol',               city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Vatwa',               city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Naranpura',           city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Paldi',               city: 'Ahmedabad',   state: 'Gujarat',     type: 'Locality' },
  { name: 'Surat',               city: 'Surat',       state: 'Gujarat',     type: 'City'     },
  { name: 'Vadodara',            city: 'Vadodara',    state: 'Gujarat',     type: 'City'     },
  { name: 'Rajkot',              city: 'Rajkot',      state: 'Gujarat',     type: 'City'     },
  { name: 'Gandhinagar',         city: 'Gandhinagar', state: 'Gujarat',     type: 'City'     },
  { name: 'Bhavnagar',           city: 'Bhavnagar',   state: 'Gujarat',     type: 'City'     },
  { name: 'Anand',               city: 'Anand',       state: 'Gujarat',     type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // RAJASTHAN
  // ══════════════════════════════════════════════════════════
  { name: 'Jaipur',              city: 'Jaipur',      state: 'Rajasthan',   type: 'City'     },
  { name: 'Vaishali Nagar',      city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Malviya Nagar Jaipur',city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'C Scheme',            city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Tonk Road',           city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Mansarovar',          city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Jagatpura',           city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Sitapura',            city: 'Jaipur',      state: 'Rajasthan',   type: 'Locality' },
  { name: 'Jodhpur',             city: 'Jodhpur',     state: 'Rajasthan',   type: 'City'     },
  { name: 'Udaipur',             city: 'Udaipur',     state: 'Rajasthan',   type: 'City'     },
  { name: 'Kota',                city: 'Kota',        state: 'Rajasthan',   type: 'City'     },
  { name: 'Ajmer',               city: 'Ajmer',       state: 'Rajasthan',   type: 'City'     },
  { name: 'Bikaner',             city: 'Bikaner',     state: 'Rajasthan',   type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // UTTAR PRADESH
  // ══════════════════════════════════════════════════════════
  { name: 'Lucknow',             city: 'Lucknow',     state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Hazratganj',          city: 'Lucknow',     state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Gomti Nagar',         city: 'Lucknow',     state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Aliganj',             city: 'Lucknow',     state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Indira Nagar',        city: 'Lucknow',     state: 'Uttar Pradesh', type: 'Locality'},
  { name: 'Kanpur',              city: 'Kanpur',      state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Agra',                city: 'Agra',        state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Varanasi',            city: 'Varanasi',    state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Prayagraj',           city: 'Prayagraj',   state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Allahabad',           city: 'Prayagraj',   state: 'Uttar Pradesh', type: 'City'  },
  { name: 'Meerut',              city: 'Meerut',      state: 'Uttar Pradesh', type: 'City'  },

  // ══════════════════════════════════════════════════════════
  // PUNJAB / HARYANA / CHANDIGARH
  // ══════════════════════════════════════════════════════════
  { name: 'Chandigarh',          city: 'Chandigarh',  state: 'Chandigarh',  type: 'City'     },
  { name: 'Sector 17',           city: 'Chandigarh',  state: 'Chandigarh',  type: 'Locality' },
  { name: 'Sector 22',           city: 'Chandigarh',  state: 'Chandigarh',  type: 'Locality' },
  { name: 'Sector 35',           city: 'Chandigarh',  state: 'Chandigarh',  type: 'Locality' },
  { name: 'Amritsar',            city: 'Amritsar',    state: 'Punjab',      type: 'City'     },
  { name: 'Ludhiana',            city: 'Ludhiana',    state: 'Punjab',      type: 'City'     },
  { name: 'Jalandhar',           city: 'Jalandhar',   state: 'Punjab',      type: 'City'     },
  { name: 'Mohali',              city: 'Mohali',      state: 'Punjab',      type: 'City'     },
  { name: 'Patiala',             city: 'Patiala',     state: 'Punjab',      type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // BIHAR / JHARKHAND
  // ══════════════════════════════════════════════════════════
  { name: 'Patna',               city: 'Patna',       state: 'Bihar',       type: 'City'     },
  { name: 'Boringkano Road',     city: 'Patna',       state: 'Bihar',       type: 'Locality' },
  { name: 'Ranchi',              city: 'Ranchi',      state: 'Jharkhand',   type: 'City'     },
  { name: 'Jamshedpur',          city: 'Jamshedpur',  state: 'Jharkhand',   type: 'City'     },
  { name: 'Dhanbad',             city: 'Dhanbad',     state: 'Jharkhand',   type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // MADHYA PRADESH / CHHATTISGARH
  // ══════════════════════════════════════════════════════════
  { name: 'Bhopal',              city: 'Bhopal',      state: 'Madhya Pradesh', type: 'City' },
  { name: 'MP Nagar',            city: 'Bhopal',      state: 'Madhya Pradesh', type: 'Locality'},
  { name: 'Indore',              city: 'Indore',      state: 'Madhya Pradesh', type: 'City' },
  { name: 'Vijay Nagar',         city: 'Indore',      state: 'Madhya Pradesh', type: 'Locality'},
  { name: 'Palasia',             city: 'Indore',      state: 'Madhya Pradesh', type: 'Locality'},
  { name: 'Jabalpur',            city: 'Jabalpur',    state: 'Madhya Pradesh', type: 'City' },
  { name: 'Gwalior',             city: 'Gwalior',     state: 'Madhya Pradesh', type: 'City' },
  { name: 'Raipur',              city: 'Raipur',      state: 'Chhattisgarh', type: 'City'   },

  // ══════════════════════════════════════════════════════════
  // ODISHA / WEST BENGAL
  // ══════════════════════════════════════════════════════════
  { name: 'Bhubaneswar',         city: 'Bhubaneswar', state: 'Odisha',      type: 'City'     },
  { name: 'Cuttack',             city: 'Cuttack',     state: 'Odisha',      type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // ASSAM / NORTH EAST
  // ══════════════════════════════════════════════════════════
  { name: 'Guwahati',            city: 'Guwahati',    state: 'Assam',       type: 'City'     },
  { name: 'Dibrugarh',           city: 'Dibrugarh',   state: 'Assam',       type: 'City'     },
  { name: 'Dispur',              city: 'Guwahati',    state: 'Assam',       type: 'Locality' },
  { name: 'Imphal',              city: 'Imphal',      state: 'Manipur',     type: 'City'     },
  { name: 'Shillong',            city: 'Shillong',    state: 'Meghalaya',   type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // UTTARAKHAND / HIMACHAL
  // ══════════════════════════════════════════════════════════
  { name: 'Dehradun',            city: 'Dehradun',    state: 'Uttarakhand', type: 'City'     },
  { name: 'Haridwar',            city: 'Haridwar',    state: 'Uttarakhand', type: 'City'     },
  { name: 'Rishikesh',           city: 'Rishikesh',   state: 'Uttarakhand', type: 'City'     },
  { name: 'Nainital',            city: 'Nainital',    state: 'Uttarakhand', type: 'City'     },
  { name: 'Shimla',              city: 'Shimla',      state: 'Himachal Pradesh', type: 'City'},
  { name: 'Manali',              city: 'Kullu',       state: 'Himachal Pradesh', type: 'City'},

  // ══════════════════════════════════════════════════════════
  // GOA
  // ══════════════════════════════════════════════════════════
  { name: 'Goa',                 city: 'Goa',         state: 'Goa',         type: 'City'     },
  { name: 'Panaji',              city: 'Goa',         state: 'Goa',         type: 'City'     },
  { name: 'Margao',              city: 'Goa',         state: 'Goa',         type: 'City'     },
  { name: 'Vasco da Gama',       city: 'Goa',         state: 'Goa',         type: 'City'     },
  { name: 'Mapusa',              city: 'Goa',         state: 'Goa',         type: 'Town'     },
  { name: 'Calangute',           city: 'Goa',         state: 'Goa',         type: 'Locality' },
  { name: 'Baga',                city: 'Goa',         state: 'Goa',         type: 'Locality' },

  // ══════════════════════════════════════════════════════════
  // KARNATAKA (OTHER)
  // ══════════════════════════════════════════════════════════
  { name: 'Mysuru',              city: 'Mysuru',      state: 'Karnataka',   type: 'City'     },
  { name: 'Mysore',              city: 'Mysuru',      state: 'Karnataka',   type: 'City'     },
  { name: 'Hubli',               city: 'Hubli',       state: 'Karnataka',   type: 'City'     },
  { name: 'Dharwad',             city: 'Dharwad',     state: 'Karnataka',   type: 'City'     },
  { name: 'Mangalore',           city: 'Mangalore',   state: 'Karnataka',   type: 'City'     },
  { name: 'Mangaluru',           city: 'Mangalore',   state: 'Karnataka',   type: 'City'     },
  { name: 'Belgaum',             city: 'Belagavi',    state: 'Karnataka',   type: 'City'     },
  { name: 'Belagavi',            city: 'Belagavi',    state: 'Karnataka',   type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // ANDHRA PRADESH
  // ══════════════════════════════════════════════════════════
  { name: 'Visakhapatnam',       city: 'Visakhapatnam', state: 'Andhra Pradesh', type: 'City'},
  { name: 'Vizag',               city: 'Visakhapatnam', state: 'Andhra Pradesh', type: 'City'},
  { name: 'Vijayawada',          city: 'Vijayawada',  state: 'Andhra Pradesh', type: 'City' },
  { name: 'Guntur',              city: 'Guntur',      state: 'Andhra Pradesh', type: 'City' },
  { name: 'Tirupati',            city: 'Tirupati',    state: 'Andhra Pradesh', type: 'City' },
  { name: 'Nellore',             city: 'Nellore',     state: 'Andhra Pradesh', type: 'City' },
  { name: 'Kakinada',            city: 'Kakinada',    state: 'Andhra Pradesh', type: 'City' },
  { name: 'Rajahmundry',         city: 'Rajahmundry', state: 'Andhra Pradesh', type: 'City' },

  // ══════════════════════════════════════════════════════════
  // TAMIL NADU (OTHER)
  // ══════════════════════════════════════════════════════════
  { name: 'Coimbatore',          city: 'Coimbatore',  state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Madurai',             city: 'Madurai',     state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Trichy',              city: 'Trichy',      state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Tiruchirappalli',     city: 'Trichy',      state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Salem',               city: 'Salem',       state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Tirunelveli',         city: 'Tirunelveli', state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Vellore',             city: 'Vellore',     state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Erode',               city: 'Erode',       state: 'Tamil Nadu',  type: 'City'     },
  { name: 'Tiruppur',            city: 'Tiruppur',    state: 'Tamil Nadu',  type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // KERALA
  // ══════════════════════════════════════════════════════════
  { name: 'Kochi',               city: 'Kochi',       state: 'Kerala',      type: 'City'     },
  { name: 'Cochin',              city: 'Kochi',       state: 'Kerala',      type: 'City'     },
  { name: 'Ernakulam',           city: 'Kochi',       state: 'Kerala',      type: 'Locality' },
  { name: 'MG Road Kochi',       city: 'Kochi',       state: 'Kerala',      type: 'Locality' },
  { name: 'Thiruvananthapuram',  city: 'Thiruvananthapuram', state: 'Kerala', type: 'City'  },
  { name: 'Trivandrum',          city: 'Thiruvananthapuram', state: 'Kerala', type: 'City'  },
  { name: 'Kozhikode',           city: 'Kozhikode',   state: 'Kerala',      type: 'City'     },
  { name: 'Calicut',             city: 'Kozhikode',   state: 'Kerala',      type: 'City'     },
  { name: 'Thrissur',            city: 'Thrissur',    state: 'Kerala',      type: 'City'     },
  { name: 'Kannur',              city: 'Kannur',      state: 'Kerala',      type: 'City'     },
  { name: 'Malappuram',          city: 'Malappuram',  state: 'Kerala',      type: 'City'     },
  { name: 'Palakkad',            city: 'Palakkad',    state: 'Kerala',      type: 'City'     },
  { name: 'Kollam',              city: 'Kollam',      state: 'Kerala',      type: 'City'     },

  // ══════════════════════════════════════════════════════════
  // UNION TERRITORIES
  // ══════════════════════════════════════════════════════════
  { name: 'Puducherry',          city: 'Puducherry',  state: 'Puducherry',  type: 'City'     },
  { name: 'Pondicherry',         city: 'Puducherry',  state: 'Puducherry',  type: 'City'     },
]

// ─── Fuzzy Search ─────────────────────────────────────────────────────────────
// Searches by name, city, and state with priority scoring:
// 1. Name starts with query (highest) 2. Name contains query 3. City contains 4. State contains
export function searchIndiaLocations(query, limit = 10) {
  if (!query || query.trim().length < 2) return []
  const q = query.trim().toLowerCase()

  const scored = INDIA_LOCATIONS.map(loc => {
    const name  = loc.name.toLowerCase()
    const city  = loc.city.toLowerCase()
    const state = loc.state.toLowerCase()

    let score = 0
    if (name === q)                   score = 100  // exact match
    else if (name.startsWith(q))      score = 80   // prefix match on name
    else if (name.includes(q))        score = 60   // contains in name
    else if (city.startsWith(q))      score = 40   // prefix match on city
    else if (city.includes(q))        score = 25   // contains in city
    else if (state.toLowerCase().includes(q)) score = 10  // state match

    return { ...loc, score }
  })
  .filter(l => l.score > 0)
  .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
  .slice(0, limit)

  return scored
}
