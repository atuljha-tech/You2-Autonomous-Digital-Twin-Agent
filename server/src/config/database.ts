import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error instanceof Error ? error.message : error);
    console.error('');
    console.error('🔧 To fix this:');
    console.error('   1. Go to https://cloud.mongodb.com');
    console.error('   2. Check your username/password in Database Access');
    console.error('   3. Check Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)');
    console.error('   4. Update MONGODB_URI in you2/server/.env');
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
