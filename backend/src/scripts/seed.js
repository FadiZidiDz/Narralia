import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Story from '../models/Story.model.js';
import StoryPart from '../models/StoryPart.model.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing
    await User.deleteMany({});
    await Story.deleteMany({});
    await StoryPart.deleteMany({});

    // Create Teachers
    const teacher = await User.create({
      name: 'Teacher Sarah',
      email: 'teacher@narralia.app',
      password: 'password123',
      role: 'teacher'
    });

    // Create Students
    const student1 = await User.create({
      name: 'Alex',
      email: 'alex@narralia.app',
      password: 'password123',
      role: 'student',
      ageLevel: 8
    });

    const student2 = await User.create({
      name: 'Mia',
      email: 'mia@narralia.app',
      password: 'password123',
      role: 'student',
      ageLevel: 10
    });

    // Story 1: Space Adventure
    const story1 = await Story.create({
      title: 'The Lost Robot of Mars',
      description: 'Help a friendly robot find its way back to the base across the red desert.',
      theme: 'science',
      ageLevel: 8,
      artStyle: 'cartoon',
      createdBy: teacher._id
    });

    await StoryPart.create([
      {
        storyId: story1._id,
        order: 1,
        title: 'The Crash Landing',
        text: 'The small spaceship shook as it touched the red dust of Mars. Beep-Boop the robot opened the hatch and looked around...',
        imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=800',
        writingPrompt: 'What does Beep-Boop see in the Martian desert?'
      },
      {
        storyId: story1._id,
        order: 2,
        title: 'The Shiny Cave',
        text: 'Deep in a canyon, Beep-Boop found a cave that glowed with a strange blue light...',
        imageUrl: 'https://images.unsplash.com/photo-1516331138075-f3ad1576e0c1?q=80&w=800',
        writingPrompt: 'What is making the cave glow?'
      }
    ]);

    // Story 2: Magic Forest
    const story2 = await Story.create({
      title: 'The Secret of Whispering Woods',
      description: 'Discover the hidden creatures that live inside the ancient oak trees.',
      theme: 'fantasy',
      ageLevel: 9,
      artStyle: 'children_book',
      createdBy: teacher._id
    });

    await StoryPart.create([
      {
        storyId: story2._id,
        order: 1,
        title: 'The Talking Squirrel',
        text: 'Lily stepped onto the mossy path and was surprised when a squirrel tipped its hat and said "Good morning!"',
        imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800',
        writingPrompt: 'What does the talking squirrel want to show Lily?'
      }
    ]);

    console.log('✅ Database Seeded Successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    process.exit(1);
  }
};

seed();
