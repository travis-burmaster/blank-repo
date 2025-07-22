import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

const PlanContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const WeekContainer = styled.div`
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
`;

const WorkoutItem = styled.div`
  padding: 10px;
  margin: 5px 0;
  background-color: ${props => props.completed ? '#e8f5e9' : '#fff'};
  border-radius: 4px;
  border: 1px solid #ddd;
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  padding: 20px;
  text-align: center;
  background-color: #ffebee;
  border-radius: 4px;
  margin: 20px 0;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
`;

const PlanView = () => {
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { planId } = useParams();

  useEffect(() => {
    const fetchTrainingPlan = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/training-plans/${planId}`);
        setTrainingPlan(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load training plan');
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      fetchTrainingPlan();
    }
  }, [planId]);

  const handleWorkoutCompletion = async (workoutId, completed) => {
    try {
      await axios.patch(`/api/workouts/${workoutId}`, { completed });
      
      setTrainingPlan(prevPlan => ({
        ...prevPlan,
        weeks: prevPlan.weeks.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => 
            workout.id === workoutId ? { ...workout, completed } : workout
          )
        }))
      }));
    } catch (err) {
      setError('Failed to update workout status');
    }
  };

  if (loading) {
    return <LoadingSpinner>Loading training plan...</LoadingSpinner>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!trainingPlan) {
    return <ErrorMessage>Training plan not found</ErrorMessage>;
  }

  return (
    <PlanContainer>
      <h1>{trainingPlan.name}</h1>
      <p>{trainingPlan.description}</p>
      
      {trainingPlan.weeks.map((week, index) => (
        <WeekContainer key={week.id}>
          <h2>Week {index + 1}</h2>
          {week.workouts.map(workout => (
            <WorkoutItem 
              key={workout.id}
              completed={workout.completed}
              onClick={() => handleWorkoutCompletion(workout.id, !workout.completed)}
            >
              <h3>{workout.title}</h3>
              <p>{workout.description}</p>
              <div>
                Distance: {workout.distance}km
                {workout.pace && <span> | Target Pace: {workout.pace}/km</span>}
              </div>
            </WorkoutItem>
          ))}
        </WeekContainer>
      ))}
    </PlanContainer>
  );
};

export default PlanView;