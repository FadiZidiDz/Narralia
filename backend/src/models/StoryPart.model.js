import mongoose from 'mongoose';

const storyPartSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  order: { type: Number, required: true }, // Part 1, Part 2, etc.
  title: { type: String, required: true },
  text: { type: String, required: true }, // The story text for this part
  imageUrl: { type: String }, // Cloudinary URL for the part image
  writingPrompt: { type: String }, // Optional prompt to help the student
  characters: [{ type: String }],
  setting: { type: String },
  mood: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('StoryPart', storyPartSchema);
