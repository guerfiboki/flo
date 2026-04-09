// file: prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wavecamp.ma' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@wavecamp.ma',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user:', admin.email)

  // Demo user
  const userPassword = await bcrypt.hash('user1234', 12)
  const user = await prisma.user.upsert({
    where: { email: 'surfer@example.com' },
    update: {},
    create: {
      name: 'Alex Surfer',
      email: 'surfer@example.com',
      password: userPassword,
    },
  })
  console.log('✅ Demo user:', user.email)

  // Listings
  const listings = [
    {
      title: 'Taghazout Surf Camp',
      slug: 'taghazout-surf-camp',
      description:
        'Experience the best surf in Morocco at our legendary Taghazout camp. Just 200 meters from the famous Anchor Point break, our camp is paradise for surfers of all levels.\n\nWe offer daily surf lessons with certified instructors, surfboard and wetsuit rentals, a rooftop terrace with panoramic ocean views, and a vibrant community of international surfers.\n\nBreakfast is included every morning with fresh Moroccan bread, argan oil, and mint tea.',
      location: 'Taghazout, Agadir-Ida-Ou-Tanane',
      pricePerNight: 75,
      capacity: 12,
      category: 'SURF_CAMP',
      images: [
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
        'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
        'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Surf board rental', 'Wetsuit rental', 'Surf lessons',
        'Breakfast included', 'Rooftop terrace', 'Airport transfer',
      ],
    },
    {
      title: 'Imsouane Bay Hostel',
      slug: 'imsouane-bay-hostel',
      description:
        'Imsouane is home to the longest wave in Africa — and our hostel sits right on the bay. Perfect for longboarders and beginners looking to log hours on a mellow, forgiving wave.\n\nThe vibe here is deeply relaxed. Think rooftop sunsets, fresh fish tagines, and making friends from around the world. Our dorms are clean, comfortable, and social.',
      location: 'Imsouane, Agadir-Ida-Ou-Tanane',
      pricePerNight: 35,
      capacity: 20,
      category: 'HOSTEL',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
        'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Surf board rental', 'Kitchen', 'Towels & linens', 'Parking',
      ],
    },
    {
      title: 'Ocean View Villa Agadir',
      slug: 'ocean-view-villa-agadir',
      description:
        'A stunning private villa perched above Agadir with unobstructed Atlantic views. This is the ultimate surf trip luxury — a private pool, spacious terraces, a fully equipped kitchen, and 4 beautifully designed bedrooms.\n\nPerfect for groups or families wanting their own space. We can arrange surf guiding, private lessons, and transfers to the best local breaks.',
      location: 'Agadir, Souss-Massa',
      pricePerNight: 350,
      capacity: 8,
      category: 'VILLA',
      images: [
        'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
        'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Pool', 'Air conditioning', 'Kitchen', 'Parking',
        'Beachfront', 'Towels & linens', 'Airport transfer',
      ],
    },
    {
      title: 'Sidi Ifni Surf Room',
      slug: 'sidi-ifni-surf-room',
      description:
        'A charming private room in a traditional riad in the heart of Sidi Ifni — one of Morocco\'s most underrated surf towns. The waves here are world-class and almost always uncrowded.\n\nThe room has a private bathroom, king bed, and access to a beautiful shared terrace. Your host Youssef is a local surfer who can take you to secret spots.',
      location: 'Sidi Ifni, Guelmim-Oued Noun',
      pricePerNight: 55,
      capacity: 2,
      category: 'ROOM',
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Air conditioning', 'Towels & linens', 'Breakfast included',
      ],
    },
    {
      title: 'Mirleft Surf & Yoga Retreat',
      slug: 'mirleft-surf-yoga-retreat',
      description:
        'Combine the best of surf and mindfulness at our boutique retreat in magical Mirleft. Mornings start with guided yoga overlooking the Atlantic. Afternoons are spent chasing waves at one of five nearby beach breaks.\n\nAll meals are included — prepared fresh daily with local Moroccan ingredients. Maximum 8 guests ensures an intimate, transformative experience.',
      location: 'Mirleft, Tiznit Province',
      pricePerNight: 120,
      capacity: 8,
      category: 'SURF_CAMP',
      images: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
        'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Surf board rental', 'Wetsuit rental', 'Surf lessons',
        'Breakfast included', 'Pool', 'Parking', 'Airport transfer',
      ],
    },
    {
      title: 'Anchor Point Guesthouse',
      slug: 'anchor-point-guesthouse',
      description:
        'Legendary location — literally 50 steps from Anchor Point, the world-famous right-hander that produces perfect barrels all winter long. This is a surfer\'s guesthouse through and through.\n\nNo frills, just good vibes, clean beds, a great kitchen to share, and the best surf right outside your door. Wax your board the night before and paddle out at dawn.',
      location: 'Taghazout, Agadir-Ida-Ou-Tanane',
      pricePerNight: 60,
      capacity: 6,
      category: 'ROOM',
      images: [
        'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
      ],
      amenities: [
        'WiFi', 'Surf board rental', 'Kitchen', 'Towels & linens', 'Parking',
      ],
    },
  ]

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { slug: listing.slug },
      update: {},
      create: listing as any,
    })
    console.log(`✅ Listing: ${listing.title}`)
  }

  console.log('\n🎉 Seed complete!')
  console.log('\n📧 Admin login: admin@wavecamp.ma / admin123')
  console.log('📧 User login:  surfer@example.com / user1234')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
