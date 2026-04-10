// Simple test script to check if backend is running
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

async function testBackendConnection() {
  console.log('Testing backend connection...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Checking if backend server is running...');
    const response = await axios.get(`${API_BASE_URL}/subjects/student/1`, {
      timeout: 5000
    });
    console.log('✅ Backend is running!');
    console.log(`   Status: ${response.status}`);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is NOT running');
      console.log('   Please start your Spring Boot backend on port 8080');
      console.log('   Run: cd d:\\Trackify\\frontend\\student-management\\student-management');
      console.log('   Then: mvn spring-boot:run');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('❌ Connection timeout');
      console.log('   Backend might be starting up or experiencing issues');
    } else {
      console.log(`⚠️  Got response but with error: ${error.response?.status || error.message}`);
      if (error.response?.status === 404) {
        console.log('   Endpoint not found - backend might be running but routes are different');
      }
    }
  }
}

testBackendConnection();

