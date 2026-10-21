/**
 * The demo marketplace's content: fictional Ethiopian wedding businesses, couples and guests.
 * Every business name is invented; none stands for a real company. Pictures live in
 * static/demo (see static/demo/manifest.json for each one's author and licence).
 */

/** How many pictures each pool in static/demo holds. */
export const POOLS = {
	couples: 10,
	venue: 9,
	photography: 7,
	decor: 8,
	catering: 9,
	coffee: 4,
	attire: 8,
	entertainment: 7,
	transport: 5,
	party: 10,
	addis: 2
};

export const pic = (pool, n) => `/demo/${pool}/${((n - 1) % POOLS[pool]) + 1}.webp`;

/**
 * category ids follow database/seed.sql: 1 venue, 2 photography, 3 decor, 4 catering,
 * 5 attire & beauty, 6 entertainment, 7 transport, 8 invitations.
 * `pool` names the picture pool its services draw from.
 */
export const VENDORS = [
	// ---- Venues
	{
		cat: 1,
		pool: 'venue',
		name: 'Entoto Grand Hall',
		city: 'Addis Ababa',
		area: 'Bole, near Edna Mall',
		min: 280000,
		max: 950000,
		guests: 900,
		policy: 'strict',
		deposit: 40,
		about:
			'A pillar-free ballroom for up to 900 guests, with a bridal suite, valet parking and an in-house kitchen that has fed Addis weddings for twelve years.',
		services: [
			['Grand ballroom (full day)', 650000],
			['Garden terrace ceremony', 220000],
			['Melse lounge (evening)', 140000]
		],
		packages: [
			['Silver evening', 380000, ['Ballroom 6 pm–midnight', 'Stage and lighting', 'Valet parking']],
			[
				'Gold full day',
				720000,
				['Ceremony terrace and ballroom', 'Bridal suite', 'Cake table and décor credit']
			]
		]
	},
	{
		cat: 1,
		pool: 'venue',
		name: 'Lake Tana Gardens',
		city: 'Bahir Dar',
		area: 'Lakeside road',
		min: 150000,
		max: 520000,
		guests: 600,
		policy: 'moderate',
		deposit: 30,
		about:
			'Lakeside lawns under fig trees, a covered reception pavilion, and rooms for the families. Sunset ceremonies over Lake Tana.',
		services: [
			['Lakeside lawn ceremony', 180000],
			['Pavilion reception', 320000]
		],
		packages: [
			['Weekend wedding', 480000, ['Lawn and pavilion', '20 guest rooms', 'Boat photo session']]
		]
	},
	{
		cat: 1,
		pool: 'venue',
		name: 'Hawassa Palm Resort',
		city: 'Hawassa',
		area: 'Lake Hawassa shore',
		min: 160000,
		max: 600000,
		guests: 700,
		policy: 'moderate',
		deposit: 30,
		about:
			'Outdoor ceremony lawns on the lake and an indoor hall for 700. Popular for destination weddings from Addis.',
		services: [
			['Lakefront ceremony', 190000],
			['Indoor hall reception', 360000]
		],
		packages: [
			[
				'Destination package',
				560000,
				['Ceremony and reception', 'Rooms for the couple and parents', 'Breakfast for 60']
			]
		]
	},
	{
		cat: 1,
		pool: 'venue',
		name: 'Yod Abyssinia Event Center',
		city: 'Addis Ababa',
		area: 'CMC, Ayat',
		min: 120000,
		max: 380000,
		guests: 450,
		policy: 'flexible',
		deposit: 25,
		about:
			'A warm, traditional hall with a stage for azmari and dancers, and a kitchen famous for its doro wat.',
		services: [
			['Traditional hall evening', 220000],
			['Kelekel lunch hall', 120000]
		],
		packages: [
			['Habesha night', 300000, ['Hall and stage', 'Traditional décor', 'Coffee ceremony corner']]
		]
	},
	{
		cat: 1,
		pool: 'venue',
		name: 'Gondar Castle View',
		city: 'Gondar',
		area: 'Fasil Ghebbi area',
		min: 90000,
		max: 300000,
		guests: 350,
		policy: 'moderate',
		deposit: 30,
		about:
			'Garden venue with a view of the royal enclosure. Small and mid-size weddings with a sense of history.',
		services: [['Garden ceremony and lunch', 180000]],
		packages: [
			[
				'Royal garden day',
				260000,
				['Garden for the day', 'Tent and chairs', 'Photo walk permit help']
			]
		]
	},
	{
		cat: 1,
		pool: 'venue',
		name: 'Bishoftu Crater Lodge',
		city: 'Bishoftu',
		area: 'Lake Hora',
		min: 200000,
		max: 700000,
		guests: 500,
		policy: 'strict',
		deposit: 40,
		about:
			'Crater-lake terraces an hour from Addis. Ceremony on the cliff lawn, reception in the glass pavilion.',
		services: [
			['Cliff lawn ceremony', 240000],
			['Glass pavilion reception', 420000]
		],
		packages: [
			['Lake weekend', 650000, ['Ceremony and reception', '15 rooms', 'Sunday Melse brunch']]
		]
	},
	// ---- Photography & video
	{
		cat: 2,
		pool: 'photography',
		name: 'Mesk Studio',
		city: 'Addis Ababa',
		area: 'Bole Medhanialem',
		min: 45000,
		max: 180000,
		policy: 'moderate',
		deposit: 30,
		login: 'mesk',
		about:
			'Documentary wedding photography and film across Shimgilina, the wedding day and Melse. Albums printed in Addis.',
		services: [
			['Wedding day photography', 85000],
			['Cinematic wedding film', 120000],
			['Engagement shoot', 25000]
		],
		packages: [
			[
				'Two-day story',
				150000,
				['Wedding day and Melse', 'Two photographers', '600 edited photos', 'Highlight film']
			],
			['Wedding day', 85000, ['10 hours coverage', '400 edited photos', 'Online gallery']]
		]
	},
	{
		cat: 2,
		pool: 'photography',
		name: 'Lalibela Films',
		city: 'Addis Ababa',
		area: 'Kazanchis',
		min: 60000,
		max: 220000,
		policy: 'strict',
		deposit: 40,
		about:
			'Wedding films with drone shots, same-day edits for the reception screen and a documentary cut for the family.',
		services: [
			['Wedding film', 140000],
			['Same-day edit', 45000]
		],
		packages: [
			['Film and photo', 210000, ['Film crew of three', 'Drone', 'Same-day edit', '300 photos']]
		]
	},
	{
		cat: 2,
		pool: 'photography',
		name: 'Selam Frames',
		city: 'Hawassa',
		area: 'Piazza',
		min: 30000,
		max: 90000,
		policy: 'flexible',
		deposit: 25,
		about: 'Warm, natural photos for weddings around Hawassa and Shashamane, with fast delivery.',
		services: [
			['Wedding photography', 55000],
			['Melse portraits', 20000]
		],
		packages: [
			['Full day', 70000, ['Ceremony to reception', '350 photos', 'Printed 30-page album']]
		]
	},
	{
		cat: 2,
		pool: 'photography',
		name: 'Blue Nile Moments',
		city: 'Bahir Dar',
		area: 'Kebele 14',
		min: 35000,
		max: 110000,
		policy: 'moderate',
		deposit: 30,
		about:
			'Photographers and videographers for Bahir Dar and Gondar weddings, including lake and monastery sessions.',
		services: [
			['Photo and video', 90000],
			['Lake portrait session', 18000]
		],
		packages: [
			['Lake wedding', 100000, ['Photo and video', 'Boat portrait session', 'Highlight film']]
		]
	},
	{
		cat: 2,
		pool: 'photography',
		name: 'Abyssinia Lens',
		city: 'Adama',
		area: 'Posta Bet',
		min: 25000,
		max: 80000,
		policy: 'flexible',
		deposit: 20,
		about: 'Affordable, reliable wedding photography for Adama and Bishoftu.',
		services: [['Wedding photography', 40000]],
		packages: [['Essentials', 40000, ['8 hours', '250 photos', 'USB delivery']]]
	},
	// ---- Decor & florals
	{
		cat: 3,
		pool: 'decor',
		name: 'Meskel Flower Décor',
		city: 'Addis Ababa',
		area: 'Sarbet',
		min: 60000,
		max: 350000,
		guests: 1000,
		policy: 'moderate',
		deposit: 40,
		about:
			'Stage design, fresh flowers from Ziway growers, table styling and lighting for halls of every size.',
		services: [
			['Stage and backdrop', 120000],
			['Table centerpieces (per 10 tables)', 35000],
			['Bridal bouquet and corsages', 9000]
		],
		packages: [
			['Full hall styling', 260000, ['Stage', '40 table centerpieces', 'Entrance arch', 'Lighting']]
		]
	},
	{
		cat: 3,
		pool: 'decor',
		name: 'Adey Abeba Events',
		city: 'Addis Ababa',
		area: 'Gerji',
		min: 40000,
		max: 220000,
		policy: 'flexible',
		deposit: 30,
		about:
			'Named for the yellow Meskel daisy: bright, traditional décor with handwoven baskets and mesob centerpieces.',
		services: [
			['Traditional décor set', 90000],
			['Coffee ceremony corner', 15000]
		],
		packages: [
			['Habesha styling', 140000, ['Mesob centerpieces', 'Woven backdrop', 'Coffee corner']]
		]
	},
	{
		cat: 3,
		pool: 'decor',
		name: 'Tana Bloom Styling',
		city: 'Bahir Dar',
		area: 'Lakeside',
		min: 30000,
		max: 150000,
		policy: 'moderate',
		deposit: 30,
		about: 'Garden and lakeside wedding styling: arches, aisle flowers and lantern lighting.',
		services: [
			['Ceremony arch and aisle', 45000],
			['Reception tables', 60000]
		],
		packages: [['Garden wedding', 110000, ['Arch and aisle', '25 tables', 'Lanterns']]]
	},
	{
		cat: 3,
		pool: 'decor',
		name: 'Royal Drape & Light',
		city: 'Hawassa',
		area: 'Tabor',
		min: 35000,
		max: 160000,
		policy: 'strict',
		deposit: 40,
		about: 'Draping, chandeliers and stage lighting that turn a plain hall into a ballroom.',
		services: [
			['Ceiling draping', 70000],
			['Stage lighting', 40000]
		],
		packages: [['Ballroom look', 140000, ['Draping', 'Chandeliers', 'Stage lighting']]]
	},
	// ---- Catering
	{
		cat: 4,
		pool: 'catering',
		name: 'Enat Bet Catering',
		city: 'Addis Ababa',
		area: 'Megenagna',
		min: 650,
		max: 1400,
		guests: 1200,
		policy: 'moderate',
		deposit: 40,
		about:
			'Wedding feasts priced per guest: doro wat, kitfo, tibs, fasting dishes and a raw-meat station, with injera baked on the day.',
		services: [
			['Traditional feast (per guest)', 950],
			['Fasting menu (per guest)', 700],
			['Wedding cake (3 tiers)', 28000]
		],
		packages: [
			[
				'Feast for 300',
				285000,
				['Five dishes and fasting dishes', 'Injera baked on site', 'Service staff']
			]
		]
	},
	{
		cat: 4,
		pool: 'catering',
		name: 'Gursha Kitchen',
		city: 'Addis Ababa',
		area: 'Old Airport',
		min: 800,
		max: 1800,
		guests: 800,
		policy: 'moderate',
		deposit: 30,
		about: 'Modern Ethiopian and international buffets, live tibs station and a dessert table.',
		services: [
			['Buffet (per guest)', 1200],
			['Live tibs station', 30000]
		],
		packages: [['Buffet for 200', 240000, ['Buffet', 'Tibs station', 'Dessert table']]]
	},
	{
		cat: 4,
		pool: 'catering',
		name: 'Buna & Cake House',
		city: 'Addis Ababa',
		area: 'Piassa',
		min: 12000,
		max: 65000,
		policy: 'flexible',
		deposit: 30,
		coffee: true,
		about:
			'Wedding cakes and a full coffee ceremony with jebena, popcorn and incense for your guests.',
		services: [
			['Wedding cake', 35000],
			['Coffee ceremony for guests', 18000]
		],
		packages: [['Cake and coffee', 48000, ['Three-tier cake', 'Coffee ceremony for 200']]]
	},
	{
		cat: 4,
		pool: 'catering',
		name: 'Hawassa Fish & Feast',
		city: 'Hawassa',
		area: 'Amora Gedel',
		min: 550,
		max: 1100,
		guests: 700,
		policy: 'flexible',
		deposit: 30,
		about: 'Lake fish, tibs and traditional dishes for southern weddings.',
		services: [['Feast (per guest)', 800]],
		packages: [
			['Feast for 250', 200000, ['Fish and meat dishes', 'Fasting dishes', 'Service staff']]
		]
	},
	{
		cat: 4,
		pool: 'catering',
		name: 'Fasil Feast',
		city: 'Gondar',
		area: 'Piazza',
		min: 500,
		max: 1000,
		guests: 600,
		policy: 'moderate',
		deposit: 30,
		about: 'Gondar-style wedding catering with tej and tella service.',
		services: [
			['Feast (per guest)', 750],
			['Tej service', 25000]
		],
		packages: [['Feast for 200', 150000, ['Traditional menu', 'Tej service', 'Staff']]]
	},
	// ---- Attire & beauty
	{
		cat: 5,
		pool: 'attire',
		name: 'Shemma Habesha Kemis',
		city: 'Addis Ababa',
		area: 'Shiro Meda',
		min: 9000,
		max: 85000,
		policy: 'strict',
		deposit: 50,
		about:
			'Handwoven habesha kemis made to measure by Shiro Meda weavers, for the bride, the groom and the bridal party.',
		services: [
			['Bridal habesha kemis', 45000],
			['Groom kuta and shirt', 18000],
			['Bridesmaid dresses (each)', 9000]
		],
		packages: [['Couple set', 60000, ['Bridal kemis', 'Groom suit', 'Two fittings']]]
	},
	{
		cat: 5,
		pool: 'attire',
		name: 'Lucy Bridal',
		city: 'Addis Ababa',
		area: 'Bole',
		min: 25000,
		max: 160000,
		policy: 'strict',
		deposit: 50,
		about: 'White gowns to rent or buy, veils and tailoring.',
		services: [
			['Gown rental', 35000],
			['Gown purchase', 120000]
		],
		packages: [['Rental and alterations', 45000, ['Gown', 'Veil', 'Alterations']]]
	},
	{
		cat: 5,
		pool: 'attire',
		name: 'Konjo Beauty Studio',
		city: 'Addis Ababa',
		area: 'CMC',
		min: 8000,
		max: 45000,
		policy: 'moderate',
		deposit: 30,
		about: 'Bridal makeup and hair, shuruba braiding, and the bridal party on the morning.',
		services: [
			['Bridal makeup and hair', 18000],
			['Shuruba braiding', 6000],
			['Bridal party (each)', 3500]
		],
		packages: [
			['Wedding morning', 32000, ['Bride makeup and hair', '4 bridesmaids', 'Touch-up kit']]
		]
	},
	{
		cat: 5,
		pool: 'attire',
		name: 'Tilet Couture',
		city: 'Hawassa',
		area: 'Piazza',
		min: 10000,
		max: 60000,
		policy: 'moderate',
		deposit: 40,
		about: 'Modern dresses with tilet borders for Melse and Kelekel.',
		services: [
			['Melse dress', 22000],
			['Groom suit', 20000]
		],
		packages: [['Melse couple', 38000, ['Bride dress', 'Groom suit']]]
	},
	{
		cat: 5,
		pool: 'attire',
		name: 'Gondar Weavers Cooperative',
		city: 'Gondar',
		area: 'Kebele 16',
		min: 7000,
		max: 40000,
		policy: 'flexible',
		deposit: 30,
		about: 'Cotton netela and kemis woven in Gondar, with family orders for the whole wedding.',
		services: [
			['Family kemis order (each)', 7000],
			['Bridal netela', 9000]
		],
		packages: [['Family of six', 40000, ['Six dresses', 'Embroidered netela']]]
	},
	// ---- Entertainment
	{
		cat: 6,
		pool: 'entertainment',
		name: 'Azmari Night Band',
		city: 'Addis Ababa',
		area: 'Kazanchis',
		min: 35000,
		max: 140000,
		policy: 'moderate',
		deposit: 30,
		about:
			'Krar, masinqo and kebero with an azmari who knows every family name by the end of the night.',
		services: [
			['Band for the evening', 90000],
			['Azmari only', 35000]
		],
		packages: [['Habesha night', 120000, ['Five musicians', 'Azmari', 'Sound system']]]
	},
	{
		cat: 6,
		pool: 'entertainment',
		name: 'DJ Abel Sound',
		city: 'Addis Ababa',
		area: 'Bole',
		min: 25000,
		max: 90000,
		policy: 'flexible',
		deposit: 25,
		about:
			'DJ, sound and lights. Ethio-jazz to the latest Teddy Afro, and the eskista set your uncles will ask for.',
		services: [
			['DJ and sound', 45000],
			['Dance floor lighting', 20000]
		],
		packages: [['Party package', 60000, ['DJ', 'Sound', 'Lighting', 'MC']]]
	},
	{
		cat: 6,
		pool: 'entertainment',
		name: 'Eskista Troupe',
		city: 'Addis Ababa',
		area: 'Arat Kilo',
		min: 20000,
		max: 70000,
		policy: 'moderate',
		deposit: 30,
		dancers: true,
		about:
			'Traditional dancers from across Ethiopia: Gojjam, Wollo, Gurage, Oromo and Tigray sets.',
		services: [
			['Dance show (45 minutes)', 40000],
			['Grand entrance dancers', 20000]
		],
		packages: [['Entrance and show', 55000, ['Entrance', 'Two sets', 'Costumes from four regions']]]
	},
	{
		cat: 6,
		pool: 'entertainment',
		name: 'Hawassa Live',
		city: 'Hawassa',
		area: 'Tabor',
		min: 20000,
		max: 80000,
		policy: 'flexible',
		deposit: 25,
		about: 'Live band and DJ for southern weddings.',
		services: [
			['Live band', 60000],
			['DJ', 25000]
		],
		packages: [['Band and DJ', 75000, ['Live band', 'DJ after midnight']]]
	},
	// ---- Transport
	{
		cat: 7,
		pool: 'transport',
		name: 'Royal Ride Wedding Cars',
		city: 'Addis Ababa',
		area: 'Bole',
		min: 15000,
		max: 90000,
		policy: 'moderate',
		deposit: 30,
		about: 'Decorated bridal cars, convoys for the families and a classic car for photos.',
		services: [
			['Bridal car (day)', 25000],
			['Convoy of 6', 70000]
		],
		packages: [['Convoy day', 85000, ['Bridal car', 'Five family cars', 'Flowers and ribbons']]]
	},
	{
		cat: 7,
		pool: 'transport',
		name: 'Addis Guest Shuttle',
		city: 'Addis Ababa',
		area: 'Megenagna',
		min: 12000,
		max: 50000,
		policy: 'flexible',
		deposit: 20,
		about: 'Buses and minibuses for guests between church, venue and home.',
		services: [
			['Minibus (day)', 12000],
			['Coach (day)', 22000]
		],
		packages: [['Guest transport', 46000, ['Two coaches', 'Two minibuses']]]
	},
	{
		cat: 7,
		pool: 'transport',
		name: 'Classic Wheels Hawassa',
		city: 'Hawassa',
		area: 'Piazza',
		min: 10000,
		max: 40000,
		policy: 'flexible',
		deposit: 25,
		about: 'Vintage and modern decorated cars in Hawassa.',
		services: [['Decorated car (day)', 15000]],
		packages: [['Two cars', 28000, ['Bridal car', 'Family car']]]
	},
	// ---- Invitations
	{
		cat: 8,
		pool: 'couples',
		name: 'Kalkidan Invitations',
		city: 'Addis Ababa',
		area: 'Piassa',
		min: 3000,
		max: 45000,
		policy: 'flexible',
		deposit: 50,
		about:
			'Printed invitations in Amharic and English, wedding programs and thank-you cards, plus help setting up your Leora Card.',
		services: [
			['Printed invitations (per 100)', 9000],
			['Leora Card setup', 3000]
		],
		packages: [
			['Print and digital', 15000, ['200 printed cards', 'Leora Card setup', 'Thank-you cards']]
		]
	},
	{
		cat: 8,
		pool: 'decor',
		name: 'Fidel Paper Studio',
		city: 'Addis Ababa',
		area: 'Sidist Kilo',
		min: 4000,
		max: 30000,
		policy: 'moderate',
		deposit: 50,
		about: 'Calligraphy in Ge’ez script, seating charts and signage.',
		services: [
			['Seating chart and signage', 12000],
			['Calligraphy invitations (per 100)', 14000]
		],
		packages: [['Signage set', 22000, ['Welcome sign', 'Seating chart', 'Table numbers']]]
	}
];

/** Vendors waiting for approval or turned down, for the admin queue. */
export const PENDING_VENDORS = [
	{
		cat: 2,
		pool: 'photography',
		name: 'Dire Dawa Snaps',
		city: 'Dire Dawa',
		min: 20000,
		max: 60000,
		status: 'pending',
		about: 'New wedding photography studio in Dire Dawa.'
	},
	{
		cat: 4,
		pool: 'catering',
		name: 'Mekelle Mesob Catering',
		city: 'Mekelle',
		min: 600,
		max: 1000,
		status: 'pending',
		about: 'Tigray-style wedding catering for Mekelle.'
	},
	{
		cat: 6,
		pool: 'entertainment',
		name: 'Night Owl Sounds',
		city: 'Adama',
		min: 15000,
		max: 40000,
		status: 'rejected',
		about: 'DJ for parties.'
	}
];

const FEMALE = [
	'Hana',
	'Selam',
	'Meron',
	'Bethlehem',
	'Tsion',
	'Hiwot',
	'Mahlet',
	'Rahel',
	'Liya',
	'Eden',
	'Saron',
	'Kidist',
	'Ruth',
	'Tigist',
	'Mekdes',
	'Feven',
	'Helen',
	'Sara',
	'Yordanos',
	'Bezawit',
	'Eyerusalem',
	'Martha',
	'Netsanet',
	'Aster',
	'Almaz',
	'Genet',
	'Tirunesh',
	'Senait',
	'Mihret',
	'Lidya'
];
const MALE = [
	'Dawit',
	'Yonas',
	'Abel',
	'Samuel',
	'Biniam',
	'Nahom',
	'Kaleb',
	'Natnael',
	'Henok',
	'Ephrem',
	'Mikiyas',
	'Yared',
	'Robel',
	'Elias',
	'Tewodros',
	'Solomon',
	'Getachew',
	'Bereket',
	'Fitsum',
	'Amanuel',
	'Tesfaye',
	'Mulugeta',
	'Haile',
	'Daniel',
	'Yohannes',
	'Girma',
	'Kebede',
	'Tadesse',
	'Ermias',
	'Michael'
];
export const SURNAMES = [
	'Tesfaye',
	'Bekele',
	'Alemu',
	'Haile',
	'Girma',
	'Tadesse',
	'Kebede',
	'Mekonnen',
	'Abebe',
	'Wolde',
	'Desta',
	'Getachew',
	'Assefa',
	'Negash',
	'Mulugeta',
	'Ayele',
	'Lemma',
	'Gebre',
	'Teshome',
	'Worku',
	'Yilma',
	'Shiferaw',
	'Demissie',
	'Hailu',
	'Tilahun'
];
export const NAMES = { FEMALE, MALE };

/**
 * The couples. `offset` is the wedding day relative to the day the seed runs: negative ones are
 * married (bookings completed, reviews, gifts), 0 is a wedding happening today, positive ones
 * are planning. `login` gives the main demo accounts memorable emails.
 */
export const COUPLES = [
	{
		bride: 'Hana',
		groom: 'Dawit',
		city: 'Addis Ababa',
		offset: 46,
		guests: 320,
		budget: 1800000,
		login: 'hana',
		partner: 'dawit',
		plan: 'platinum',
		rich: true
	},
	{
		bride: 'Selam',
		groom: 'Yonas',
		city: 'Addis Ababa',
		offset: 0,
		guests: 250,
		budget: 1400000,
		login: 'selam',
		partner: 'yonas',
		plan: 'platinum',
		rich: true
	},
	{
		bride: 'Meron',
		groom: 'Abel',
		city: 'Bahir Dar',
		offset: 12,
		guests: 180,
		budget: 900000,
		plan: 'golden'
	},
	{
		bride: 'Tsion',
		groom: 'Kaleb',
		city: 'Hawassa',
		offset: 74,
		guests: 220,
		budget: 1100000,
		plan: 'golden'
	},
	{
		bride: 'Bethlehem',
		groom: 'Nahom',
		city: 'Addis Ababa',
		offset: 120,
		guests: 400,
		budget: 2400000,
		plan: 'platinum'
	},
	{
		bride: 'Mahlet',
		groom: 'Henok',
		city: 'Gondar',
		offset: 160,
		guests: 150,
		budget: 650000,
		plan: 'free'
	},
	{
		bride: 'Liya',
		groom: 'Ephrem',
		city: 'Addis Ababa',
		offset: 210,
		guests: 280,
		budget: 1500000,
		plan: 'golden'
	},
	{
		bride: 'Eden',
		groom: 'Mikiyas',
		city: 'Bishoftu',
		offset: 95,
		guests: 200,
		budget: 1200000,
		plan: 'free'
	},
	{
		bride: 'Rahel',
		groom: 'Natnael',
		city: 'Addis Ababa',
		offset: 33,
		guests: 260,
		budget: 1300000,
		plan: 'golden'
	},
	{
		bride: 'Hiwot',
		groom: 'Samuel',
		city: 'Adama',
		offset: 250,
		guests: 170,
		budget: 700000,
		plan: 'free'
	},
	{
		bride: 'Saron',
		groom: 'Yared',
		city: 'Addis Ababa',
		offset: -9,
		guests: 300,
		budget: 1600000,
		plan: 'platinum'
	},
	{
		bride: 'Kidist',
		groom: 'Robel',
		city: 'Hawassa',
		offset: -24,
		guests: 210,
		budget: 950000,
		plan: 'golden'
	},
	{
		bride: 'Ruth',
		groom: 'Elias',
		city: 'Addis Ababa',
		offset: -41,
		guests: 350,
		budget: 2000000,
		plan: 'platinum'
	},
	{
		bride: 'Tigist',
		groom: 'Tewodros',
		city: 'Bahir Dar',
		offset: -63,
		guests: 190,
		budget: 850000,
		plan: 'golden'
	},
	{
		bride: 'Mekdes',
		groom: 'Solomon',
		city: 'Addis Ababa',
		offset: -88,
		guests: 240,
		budget: 1250000,
		plan: 'golden'
	},
	{
		bride: 'Feven',
		groom: 'Bereket',
		city: 'Gondar',
		offset: -110,
		guests: 160,
		budget: 600000,
		plan: 'free'
	},
	{
		bride: 'Helen',
		groom: 'Fitsum',
		city: 'Addis Ababa',
		offset: -135,
		guests: 280,
		budget: 1450000,
		plan: 'golden'
	},
	{
		bride: 'Sara',
		groom: 'Amanuel',
		city: 'Hawassa',
		offset: -160,
		guests: 230,
		budget: 1000000,
		plan: 'free'
	},
	{
		bride: 'Yordanos',
		groom: 'Biniam',
		city: 'Addis Ababa',
		offset: -190,
		guests: 320,
		budget: 1700000,
		plan: 'platinum'
	},
	{
		bride: 'Bezawit',
		groom: 'Daniel',
		city: 'Bishoftu',
		offset: -220,
		guests: 200,
		budget: 1100000,
		plan: 'golden'
	},
	{
		bride: 'Martha',
		groom: 'Yohannes',
		city: 'Addis Ababa',
		offset: -260,
		guests: 260,
		budget: 1300000,
		plan: 'free'
	},
	{
		bride: 'Netsanet',
		groom: 'Ermias',
		city: 'Bahir Dar',
		offset: -300,
		guests: 180,
		budget: 800000,
		plan: 'golden'
	},
	{
		bride: 'Senait',
		groom: 'Michael',
		city: 'Addis Ababa',
		offset: -340,
		guests: 300,
		budget: 1600000,
		plan: 'golden'
	},
	{
		bride: 'Lidya',
		groom: 'Haile',
		city: 'Adama',
		offset: -380,
		guests: 220,
		budget: 900000,
		plan: 'free'
	}
];

export const REVIEWS = {
	5: [
		[
			'Perfect day',
			'They understood exactly what we wanted and our families still talk about it. Worth every birr.'
		],
		[
			'Beyond expectations',
			'Professional, on time and so kind to our parents. We would book them again tomorrow.'
		],
		[
			'Thank you!',
			'Everything was ready before we arrived. Our guests kept asking for their number.'
		],
		[
			'Highly recommend',
			'Clear prices, no surprises, and the result was more beautiful than the pictures we showed them.'
		],
		['ምርጥ አገልግሎት', 'በጣም ጥሩ ሥራ ሠርተውልናል። ቤተሰባችን በጣም ተደስቷል። እናመሰግናለን!']
	],
	4: [
		[
			'Very good',
			'Great quality. Arrived a little late in the morning but made up for it during the day.'
		],
		[
			'Lovely work',
			'Our guests loved it. Communication before the wedding could have been a bit faster.'
		],
		['Good value', 'Good service for the price, and they handled a last-minute change calmly.']
	],
	3: [['Mixed', 'The result was good but we had to follow up several times about the timeline.']]
};

export const VENDOR_REPLIES = [
	'Thank you so much! It was an honour to be part of your wedding.',
	'እናመሰግናለን! ለትዳራችሁ መልካም ምኞታችንን እንገልጻለን።',
	'Thank you for the kind words, and congratulations again!',
	'Thank you for the honest feedback. We have since added a second coordinator so this does not happen again.'
];

export const BLESSINGS = [
	'እንኳን ደስ አላችሁ! ትዳራችሁ የፍቅርና የሰላም ይሁን።',
	'Congratulations! Wishing you a lifetime of love and laughter.',
	'May God bless your home with peace and many happy years.',
	'እግዚአብሔር ይባርካችሁ፤ ቤታችሁ በበረከት ይሙላ።',
	'So happy for you both. Selam, you looked like a queen today!',
	'To the most beautiful couple: may your love grow every year.',
	'እንኳን ለዚህ አበቃችሁ! ልጆችና የልጅ ልጆች ያሳያችሁ።',
	'What a wedding! Thank you for letting us celebrate with you.'
];

export const SONGS = [
	'Teddy Afro — Lambadina',
	'Tilahun Gessesse — Tizita',
	'Aster Aweke — Abebayehosh',
	'Mahmoud Ahmed — Ere Mela Mela',
	'Gigi — Abebayehosh',
	'Rophnan — Sidist',
	'Betty G — Manew Fitsum',
	'Abush Zeleke — Wedding song',
	'Teddy Afro — Mar Eske Tuaf',
	'Hamelmal Abate — Shegitu'
];

export const GIFT_FROM = [
	'Aunt Almaz',
	'Uncle Getachew',
	'The Bekele family',
	'Mekdes & Yared',
	'Colleagues at Awash Bank',
	'Grandma Tirunesh',
	'Abel and friends',
	'The Haile family',
	'Your cousins in Dire Dawa',
	'Team at Ethio Telecom'
];

export const TESTIMONIALS = [
	[
		'Hana & Dawit',
		'Married in Addis Ababa',
		'We booked our venue, photographer and caterer in one weekend, and the payment was held until the day. Our parents finally stopped worrying.',
		1
	],
	[
		'Ruth & Elias',
		'Married in Addis Ababa',
		'The guest list and the QR entry passes saved us at the door: 350 guests, no confusion, and the photo wall was the hit of the night.',
		6
	],
	[
		'Kidist & Robel',
		'Married in Hawassa',
		'We planned from Addis for a wedding in Hawassa. Seeing which vendors were free on our date made it so easy.',
		9
	]
];
