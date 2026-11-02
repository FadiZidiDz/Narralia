import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  theme: { 
    type: String, 
    enum: ['adventure', 'fantasy', 'science', 'friendship', 'nature', 'animals'],
    default: 'adventure' 
  },
  ageLevel: { type: Number, default: 8 },
  language: { type: String, default: 'English' },
  artStyle: { 
    type: String, 
    enum: ['children_book', 'cartoon', 'realistic_soft'],
    default: 'children_book'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vocabulary: [{
    word: { type: String, required: true },
    definition: { type: String, default: '' },
    example: { type: String, default: '' },
  }],
  vocabularyFileName: { type: String },
  vocabularyUpdatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Story', storySchema);
