import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getSchoolCode } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password, userType = 'employee') => {
    const endpoint = userType === 'student'
      ? '/auth/student/login'
      : '/auth/employee/login';

    const response = await api.post(endpoint, {
      username,
      password,
    });

    const { token, displayName } = response.data;

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      id: payload.id,
      loginName: payload.login_name,
      displayName: displayName || payload.login_name,
      schoolId: payload.school_id,
      schoolCode: payload.school_code,
      type: payload.type || userType,
      roles: payload.roles || [],
    };

    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    schoolCode: getSchoolCode(),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
