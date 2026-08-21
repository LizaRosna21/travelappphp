import { pool } from './server/db';

async function createSocialTables() {
  try {
    console.log('Creating reviews table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER REFERENCES bookings(id),
        route_id INTEGER REFERENCES routes(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE NOT NULL,
        is_published BOOLEAN DEFAULT TRUE NOT NULL,
        helpfulness_score INTEGER DEFAULT 0 NOT NULL,
        reported_count INTEGER DEFAULT 0 NOT NULL,
        metadata JSONB DEFAULT '{}' NOT NULL
      )
    `);
    console.log('reviews table created successfully');
    
    console.log('Creating review_votes table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_votes (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        review_id INTEGER NOT NULL REFERENCES reviews(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful', 'report')),
        UNIQUE (review_id, user_id, vote_type)
      )
    `);
    console.log('review_votes table created successfully');
    
    console.log('Creating review_replies table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_replies (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        review_id INTEGER NOT NULL REFERENCES reviews(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_published BOOLEAN DEFAULT TRUE NOT NULL,
        is_staff_reply BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);
    console.log('review_replies table created successfully');

    console.log('Creating social_shares table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_shares (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER REFERENCES bookings(id),
        review_id INTEGER REFERENCES reviews(id),
        content_type TEXT NOT NULL,
        platform TEXT NOT NULL,
        share_url TEXT,
        status TEXT DEFAULT 'completed' NOT NULL,
        metadata JSONB DEFAULT '{}' NOT NULL
      )
    `);
    console.log('social_shares table created successfully');
    
    console.log('Creating support_requests table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_requests (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER REFERENCES bookings(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'normal' NOT NULL,
        status TEXT DEFAULT 'open' NOT NULL,
        assigned_to INTEGER REFERENCES users(id),
        resolution_note TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        attachments JSONB DEFAULT '[]' NOT NULL,
        metadata JSONB DEFAULT '{}' NOT NULL
      )
    `);
    console.log('support_requests table created successfully');

    console.log('Creating support_messages table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        support_request_id INTEGER NOT NULL REFERENCES support_requests(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        is_staff BOOLEAN DEFAULT FALSE NOT NULL,
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]' NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);
    console.log('support_messages table created successfully');

    console.log('Altering notifications table to add foreign key constraint...');
    await pool.query(`
      ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id)
    `);
    console.log('notifications table altered successfully');

    console.log('All tables created/updated successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    process.exit(0);
  }
}

createSocialTables();