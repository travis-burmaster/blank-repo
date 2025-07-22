const mongoose = require('mongoose');

const trainingPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  targetRace: {
    name: String,
    date: Date,
    distance: Number
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  weeklySchedule: [{
    weekNumber: Number,
    days: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      },
      workout: {
        type: {
          type: String,
          enum: ['rest', 'easy', 'tempo', 'intervals', 'long']
        },
        distance: Number,
        duration: Number,
        description: String
      }
    }]
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
trainingPlanSchema.index({ userId: 1, startDate: 1 });

// Pre-save hook to validate dates
trainingPlanSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('Start date must be before end date'));
  }
  if (this.targetRace && this.targetRace.date < this.startDate) {
    next(new Error('Race date must be after start date'));
  }
  next();
});

// Instance method to calculate total training weeks
trainingPlanSchema.methods.getTotalWeeks = function() {
  return Math.ceil((this.endDate - this.startDate) / (7 * 24 * 60 * 60 * 1000));
};

// Static method to find active plans for a user
trainingPlanSchema.statics.findActiveUserPlans = function(userId) {
  return this.find({
    userId: userId,
    isActive: true,
    endDate: { $gte: new Date() }
  }).sort({ startDate: 1 });
};

const TrainingPlan = mongoose.model('TrainingPlan', trainingPlanSchema);

module.exports = TrainingPlan;