import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flexGrow: 1,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
}));

const Dashboard = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [trainingData, setTrainingData] = useState({
    upcomingRuns: [],
    recentActivities: [],
    weeklyStats: null,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [userResponse, trainingResponse] = await Promise.all([
          axios.get('/api/user/profile'),
          axios.get('/api/training/dashboard'),
        ]);

        setUserData(userResponse.data);
        setTrainingData(trainingResponse.data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Container className={classes.root}>
        <Typography color="error" align="center">
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Welcome back, {userData?.name}
          </Typography>
        </Grid>

        {/* Weekly Progress Summary */}
        <Grid item xs={12} md={6}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h6" gutterBottom>
                Weekly Progress
              </Typography>
              <Typography>
                Distance: {trainingData.weeklyStats?.totalDistance || 0} km
              </Typography>
              <Typography>
                Time: {trainingData.weeklyStats?.totalTime || 0} minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Runs */}
        <Grid item xs={12} md={6}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h6" gutterBottom>
                Upcoming Runs
              </Typography>
              {trainingData.upcomingRuns.map((run) => (
                <Typography key={run.id}>
                  {new Date(run.date).toLocaleDateString()}: {run.distance}km{' '}
                  {run.type}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              {trainingData.recentActivities.map((activity) => (
                <Typography key={activity.id}>
                  {new Date(activity.date).toLocaleDateString()} -{' '}
                  {activity.description}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;