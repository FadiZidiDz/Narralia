import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  storyPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryPart', required: true },
  writtenText: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['draft', 'submitted', 'reviewed'], 
    default: 'draft' 
  },
  essaiResult: {
    score: Number,
    rubricBreakdown: Object,
    strengths: [String],
    improvements: [String],
    overallFeedback: String
  },
  audioUrl: { type: String }, // Saved Cloudinary audio URL (optional)
  generatedImageUrl: { type: String }, // Legacy field / Scene image
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Submission', submissionSchema);
