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
    totalMileage: Number,
    workouts: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      type: {
        type: String,
        enum: ['rest', 'easy', 'tempo', 'intervals', 'long']
      },
      distance: Number,
      duration: Number,
      description: String,
      completed: {
        type: Boolean,
        default: false
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
trainingPlanSchema.index({ userId: 1, isActive: 1 });

// Pre-save hook to validate dates
trainingPlanSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  if (this.targetRace && this.targetRace.date < this.startDate) {
    next(new Error('Target race date must be after plan start date'));
  }
  next();
});

// Instance method to calculate progress
trainingPlanSchema.methods.calculateProgress = function() {
  if (!this.weeklySchedule) return 0;
  
  const totalWorkouts = this.weeklySchedule.reduce((acc, week) => 
    acc + week.workouts.length, 0);
  const completedWorkouts = this.weeklySchedule.reduce((acc, week) => 
    acc + week.workouts.filter(w => w.completed).length, 0);
    
  return totalWorkouts ? (completedWorkouts / totalWorkouts) * 100 : 0;
};

// Static method to find active plans for user
trainingPlanSchema.statics.findActiveUserPlans = function(userId) {
  return this.find({
    userId,
    isActive: true,
    endDate: { $gte: new Date() }
  }).sort({ startDate: 1 });
};

const TrainingPlan = mongoose.model('TrainingPlan', trainingPlanSchema);

module.exports = TrainingPlan;