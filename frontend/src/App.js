import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Snackbar,
  Alert,
  LinearProgress,
  Fab,
  Badge,
  Avatar,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Code as CodeIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Rocket as RocketIcon,
  Analytics as AnalyticsIcon,
  Assignment as ProjectIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [socket, setSocket] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    technology: '',
    status: 'planning'
  });

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io(API_BASE, {
        auth: { token: localStorage.getItem('token') }
      });

      newSocket.on('connect', () => {
        console.log('🔗 Connected to WebSocket');
      });

      newSocket.on('project-updated', (data) => {
        setNotification({
          open: true,
          message: `Project "${data.name}" was updated!`,
          severity: 'info'
        });
        fetchProjects();
      });

      newSocket.on('notification', (data) => {
        setNotifications(prev => [...prev, data]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchProjects();
      fetchAnalytics();
    }
  }, []);

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API call failed');
    }

    return response.json();
  };

  const handleAuth = async (isLogin) => {
    try {
      setLoading(true);
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = isLogin ? loginForm : registerForm;

      const result = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);

      setNotification({
        open: true,
        message: `${isLogin ? 'Login' : 'Registration'} successful!`,
        severity: 'success'
      });

      if (!isLogin) {
        setIsLoginMode(true);
        setRegisterForm({ username: '', email: '', password: '' });
      } else {
        setLoginForm({ email: '', password: '' });
        fetchProjects();
        fetchAnalytics();
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProjects([]);
    setAnalytics({});
    if (socket) {
      socket.close();
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await apiCall('/api/projects');
      setProjects(data);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to fetch projects',
        severity: 'error'
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiCall('/api/analytics/stats');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);
      const endpoint = editingProject ? `/api/projects/${editingProject._id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';

      await apiCall(endpoint, {
        method,
        body: JSON.stringify(projectForm)
      });

      setNotification({
        open: true,
        message: `Project ${editingProject ? 'updated' : 'created'} successfully!`,
        severity: 'success'
      });

      setOpenDialog(false);
      setProjectForm({ name: '', description: '', technology: '', status: 'planning' });
      setEditingProject(null);
      fetchProjects();
      fetchAnalytics();

      // Notify other users via WebSocket
      if (socket) {
        socket.emit('project-update', {
          projectId: editingProject?._id,
          name: projectForm.name,
          action: editingProject ? 'updated' : 'created'
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description || '',
      technology: project.technology,
      status: project.status
    });
    setOpenDialog(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await apiCall(`/api/projects/${projectId}`, { method: 'DELETE' });
      setNotification({
        open: true,
        message: 'Project deleted successfully!',
        severity: 'success'
      });
      fetchProjects();
      fetchAnalytics();
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'default',
      development: 'primary',
      testing: 'warning',
      deployed: 'success'
    };
    return colors[status] || 'default';
  };

  const getTechnologyIcon = (tech) => {
    const icons = {
      'React': <CodeIcon />,
      'Node.js': <CodeIcon />,
      'Python': <CodeIcon />,
      'Docker': <CloudIcon />,
      'AWS': <CloudIcon />,
      'Security': <SecurityIcon />
    };
    return icons[tech] || <ProjectIcon />;
  };

  // Login/Register UI
  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
            <RocketIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              MCP Supreme
            </Typography>
          </Box>
          
          <Typography variant="h6" align="center" gutterBottom>
            {isLoginMode ? 'Login to your account' : 'Create new account'}
          </Typography>

          <Box component="form" sx={{ mt: 3 }}>
            {!isLoginMode && (
              <TextField
                fullWidth
                label="Username"
                margin="normal"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              />
            )}
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={isLoginMode ? loginForm.email : registerForm.email}
              onChange={(e) => {
                if (isLoginMode) {
                  setLoginForm({ ...loginForm, email: e.target.value });
                } else {
                  setRegisterForm({ ...registerForm, email: e.target.value });
                }
              }}
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={isLoginMode ? loginForm.password : registerForm.password}
              onChange={(e) => {
                if (isLoginMode) {
                  setLoginForm({ ...loginForm, password: e.target.value });
                } else {
                  setRegisterForm({ ...registerForm, password: e.target.value });
                }
              }}
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={() => handleAuth(isLoginMode)}
              disabled={loading}
              startIcon={loading ? <LinearProgress /> : <RocketIcon />}
            >
              {loading ? 'Processing...' : (isLoginMode ? 'Login' : 'Register')}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => setIsLoginMode(!isLoginMode)}
            >
              {isLoginMode ? 'Need an account? Register' : 'Already have an account? Login'}
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Main App UI
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <RocketIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MCP Supreme Demo App
          </Typography>
          
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Analytics">
            <IconButton color="inherit">
              <AnalyticsIcon />
            </IconButton>
          </Tooltip>

          <Avatar sx={{ ml: 2, mr: 1 }}>
            <PersonIcon />
          </Avatar>
          
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.username}
          </Typography>
          
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Analytics Dashboard */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <DashboardIcon color="primary" sx={{ mr: 2 }} />
                  <div>
                    <Typography variant="h4">{analytics.userProjects || 0}</Typography>
                    <Typography color="textSecondary">Your Projects</Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ProjectIcon color="success" sx={{ mr: 2 }} />
                  <div>
                    <Typography variant="h4">{analytics.projectCount || 0}</Typography>
                    <Typography color="textSecondary">Total Projects</Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PersonIcon color="info" sx={{ mr: 2 }} />
                  <div>
                    <Typography variant="h4">{analytics.userCount || 0}</Typography>
                    <Typography color="textSecondary">Total Users</Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CloudIcon color="warning" sx={{ mr: 2 }} />
                  <div>
                    <Typography variant="h4">AWS</Typography>
                    <Typography color="textSecondary">Deployment Ready</Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Projects Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h2">
            Your Projects
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Project
          </Button>
        </Box>

        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project._id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getTechnologyIcon(project.technology)}
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      label={project.status}
                      color={getStatusColor(project.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography color="textSecondary" paragraph>
                    {project.description || 'No description available'}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Technology: {project.technology}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between">
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => handleEditProject(project)}
                      size="small"
                    >
                      Edit
                    </Button>
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteProject(project._id)}
                      color="error"
                      size="small"
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {projects.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
            <RocketIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No projects yet
            </Typography>
            <Typography color="textSecondary" paragraph>
              Create your first project to get started with MCP Supreme!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Create First Project
            </Button>
          </Paper>
        )}
      </Container>

      {/* Create/Edit Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Technology</InputLabel>
            <Select
              value={projectForm.technology}
              label="Technology"
              onChange={(e) => setProjectForm({ ...projectForm, technology: e.target.value })}
            >
              <MenuItem value="React">React</MenuItem>
              <MenuItem value="Node.js">Node.js</MenuItem>
              <MenuItem value="Python">Python</MenuItem>
              <MenuItem value="Docker">Docker</MenuItem>
              <MenuItem value="AWS">AWS</MenuItem>
              <MenuItem value="Security">Security</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={projectForm.status}
              label="Status"
              onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="testing">Testing</MenuItem>
              <MenuItem value="deployed">Deployed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditingProject(null);
            setProjectForm({ name: '', description: '', technology: '', status: 'planning' });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained"
            disabled={loading || !projectForm.name || !projectForm.technology}
          >
            {loading ? 'Saving...' : (editingProject ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default App;