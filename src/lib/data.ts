export const vendors = [
	{
		id: 1,
		name: 'Sheraton Addis',
		category: 'venue',
		price: 180000,
		rating: 4.9,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
		tags: ['Luxury', 'Pool', 'Garden']
	},
	{
		id: 2,
		name: 'Lensa Photography',
		category: 'photo',
		price: 45000,
		rating: 4.8,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&h=300&fit=crop',
		tags: ['Cinematic', 'Same-day edit']
	},
	{
		id: 3,
		name: 'Golden Band',
		category: 'music',
		price: 35000,
		rating: 4.7,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
		tags: ['Live music', 'DJ included']
	},
	{
		id: 4,
		name: 'Royal Decor',
		category: 'decor',
		price: 75000,
		rating: 4.9,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=400&h=300&fit=crop',
		tags: ['Floral', 'Lighting']
	},
	{
		id: 5,
		name: 'Habesha Catering',
		category: 'catering',
		price: 120000,
		rating: 4.6,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=300&fit=crop',
		tags: ['Kitfo', 'Traditional']
	},
	{
		id: 6,
		name: "Bride's Dream",
		category: 'dress',
		price: 25000,
		rating: 4.8,
		location: 'Addis Ababa',
		image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&h=300&fit=crop',
		tags: ['Designer', 'Rental']
	}
];

export const categories = [
	{ name: 'Venue & Hotel', icon: 'building-2', count: 45 },
	{ name: 'Photography', icon: 'camera', count: 78 },
	{ name: 'Catering', icon: 'utensils', count: 56 },
	{ name: 'Decor', icon: 'flower-2', count: 34 },
	{ name: 'Music & Band', icon: 'music', count: 29 },
	{ name: 'Car Rental', icon: 'car', count: 23 },
	{ name: 'Makeup', icon: 'sparkles', count: 67 },
	{ name: 'Dress & Suit', icon: 'shirt', count: 41 },
	{ name: 'Cake', icon: 'cake', count: 28 },
	{ name: 'Invitations', icon: 'mail', count: 19 },
	{ name: 'Jewelry', icon: 'gem', count: 15 },
	{ name: 'Drinks', icon: 'wine', count: 22 }
];

export const budgetCategories = [
	{ name: 'Venue & Hotel', percent: 35, icon: 'building-2', color: '#C9A227' },
	{ name: 'Catering', percent: 25, icon: 'utensils', color: '#D4A574' },
	{ name: 'Photography', percent: 12, icon: 'camera', color: '#9CAF88' },
	{ name: 'Decor', percent: 15, icon: 'flower-2', color: '#E8B4B8' },
	{ name: 'Music & Band', percent: 8, icon: 'music', color: '#B8A9C9' },
	{ name: 'Other', percent: 5, icon: 'more-horizontal', color: '#D4C4B0' }
];

export const testimonials = [
	{
		name: 'Hanna & Dawit',
		quote:
			'Leora made planning our wedding so effortless. The budget tool saved us thousands and the vendors were world-class.',
		image: 'https://images.unsplash.com/photo-1588515724527-074a7a56616c?w=100&h=100&fit=crop',
		date: 'March 2024'
	},
	{
		name: 'Sara & Michael',
		quote:
			"We found our dream venue through Leora in 20 minutes. The entire process was smooth and the support team is wonderful.",
		image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=100&h=100&fit=crop',
		date: 'January 2024'
	},
	{
		name: 'Tigist & Yonas',
		quote:
			'The AI budget planner is a game-changer. It recommended the perfect vendors for our 500-guest Traditional Ethiopian wedding.',
		image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=100&h=100&fit=crop',
		date: 'December 2023'
	}
];

export const bookedVendors = [
	{
		id: 1,
		name: 'Sheraton Addis',
		type: 'Venue',
		price: 180000,
		status: 'booked',
		icon: 'building-2'
	},
	{
		id: 2,
		name: 'Lensa Photography',
		type: 'Photo & Video',
		price: 45000,
		status: 'pending',
		icon: 'camera'
	},
	{
		id: 3,
		name: 'Royal Decor',
		type: 'Decor',
		price: 75000,
		status: 'booked',
		icon: 'flower-2'
	}
];

export const weddingTimeline = [
	{
		timeframe: '12 Months Before',
		task: 'Book Wedding Venue',
		status: 'done'
	},
	{
		timeframe: '9 Months Before',
		task: 'Hire Photographer',
		status: 'done'
	},
	{
		timeframe: '6 Months Before',
		task: 'Order Wedding Dress',
		status: 'inprogress'
	},
	{
		timeframe: '3 Months Before',
		task: 'Finalize Catering',
		status: 'upcoming'
	}
];

export const checklist = [
	{ id: 1, text: 'Choose wedding date', done: true },
	{ id: 2, text: 'Book venue', done: true },
	{ id: 3, text: 'Send invitations', done: false },
	{ id: 4, text: 'Arrange transportation', done: false },
	{ id: 5, text: 'Plan honeymoon', done: false }
];
