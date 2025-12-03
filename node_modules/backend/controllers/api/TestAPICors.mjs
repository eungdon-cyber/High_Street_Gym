// ============================================================================
// CORS & Preflight Test Scripts for High Street Gym REST API
// ============================================================================
// Instructions:
// 1. Open any external website (e.g., Google, Wikipedia, TAFE QLD)
// 2. Open DevTools Console (F12)
// 3. Type 'allow pasting' and press Enter
// 4. Copy and paste each test script below
// 5. Press Enter to execute
// 6. Check Network tab for OPTIONS preflight request
// ============================================================================

// Update this with a valid authentication key (get from POST /api/login)
const AUTH_KEY = 'ffcf70ea-b8d1-4868-ab02-c0af4b228885';
const BASE_URL = 'http://localhost:8080/api';

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Test 1: POST /api/login - Authenticate user and get API key
(async () => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({ email: 'admin1@hsg.com', password: '0000' })
  });
  const data = await response.json();
  console.log('✅ POST /api/login - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ POST /api/login - CORS Failed:', err.message));

// Test 2: DELETE /api/logout - Deauthenticate user
(async () => {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: 'DELETE',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ DELETE /api/logout - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ DELETE /api/logout - CORS Failed:', err.message));

// ============================================================================
// USER ENDPOINTS
// ============================================================================

// Test 3: POST /api/users/register - Register a new user
(async () => {
  const randomEmail = `testuser${Math.floor(Math.random() * 1000000)}@test.com`;
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({
      email: randomEmail,
      password: 'test123',
      firstName: 'Test',
      lastName: 'User'
    })
  });
  const data = await response.json();
  console.log('✅ POST /api/users/register - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ POST /api/users/register - CORS Failed:', err.message));

// Test 4: GET /api/users/self - Get current authenticated user
(async () => {
  const response = await fetch(`${BASE_URL}/users/self`, {
    method: 'GET',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/users/self - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/users/self - CORS Failed:', err.message));

// Test 5: PUT /api/users/self - Update current authenticated user
(async () => {
  const response = await fetch(`${BASE_URL}/users/self`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({ firstName: 'Updated', lastName: 'Name' })
  });
  const data = await response.json();
  console.log('✅ PUT /api/users/self - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Updated:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ PUT /api/users/self - CORS Failed:', err.message));

// ============================================================================
// BLOG ENDPOINTS
// ============================================================================

// Test 6: GET /api/blogs - Get all blog posts
(async () => {
  const response = await fetch(`${BASE_URL}/blogs`, {
    method: 'GET',
    headers: {
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/blogs - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data.length, 'records');
  console.log('Sample Data:', data[0]);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/blogs - CORS Failed:', err.message));

// Test 7: GET /api/blogs/:id - Get a blog post by ID
(async () => {
  const response = await fetch(`${BASE_URL}/blogs/1`, {
    method: 'GET',
    headers: {
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/blogs/:id - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/blogs/:id - CORS Failed:', err.message));

// Test 8: POST /api/blogs - Create a new blog post
(async () => {
  const response = await fetch(`${BASE_URL}/blogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({
      title: 'CORS Test Blog Post',
      content: 'This blog post was created to test CORS functionality.'
    })
  });
  const data = await response.json();
  console.log('✅ POST /api/blogs - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Created:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ POST /api/blogs - CORS Failed:', err.message));

// Test 9: DELETE /api/blogs/:id - Delete a blog post
(async () => {
  const response = await fetch(`${BASE_URL}/blogs/1`, {
    method: 'DELETE',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ DELETE /api/blogs/:id - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ DELETE /api/blogs/:id - CORS Failed:', err.message));

// ============================================================================
// SESSION ENDPOINTS
// ============================================================================

// Test 10: GET /api/sessions - Get all sessions
(async () => {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'GET',
    headers: {
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/sessions - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data.length, 'records');
  console.log('Sample Data:', data[0]);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/sessions - CORS Failed:', err.message));

// Test 11: GET /api/sessions/self - Get authenticated trainer's sessions
(async () => {
  const response = await fetch(`${BASE_URL}/sessions/self`, {
    method: 'GET',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/sessions/self - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data.length, 'records');
  console.log('Sample Data:', data[0]);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/sessions/self - CORS Failed:', err.message));

// Test 12: POST /api/sessions - Create a new session
(async () => {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({
      activityId: 1,
      locationId: 1,
      sessionDate: '2025-12-01',
      sessionTime: '10:00:00'
    })
  });
  const data = await response.json();
  console.log('✅ POST /api/sessions - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Created:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ POST /api/sessions - CORS Failed:', err.message));

// Test 13: DELETE /api/sessions/:id - Cancel a session
(async () => {
  const response = await fetch(`${BASE_URL}/sessions/1`, {
    method: 'DELETE',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ DELETE /api/sessions/:id - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ DELETE /api/sessions/:id - CORS Failed:', err.message));

// Test 14: GET /api/sessions/export/xml/weekly - Export trainer's weekly sessions as XML
(async () => {
  const response = await fetch(`${BASE_URL}/sessions/export/xml/weekly`, {
    method: 'GET',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const text = await response.text();
  console.log('✅ GET /api/sessions/export/xml/weekly - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 XML Data Retrieved:', text.substring(0, 200) + '...');
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/sessions/export/xml/weekly - CORS Failed:', err.message));

// ============================================================================
// BOOKING ENDPOINTS
// ============================================================================

// Test 15: GET /api/bookings/self - Get authenticated member's bookings
(async () => {
  const response = await fetch(`${BASE_URL}/bookings/self`, {
    method: 'GET',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ GET /api/bookings/self - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Retrieved:', data.length, 'records');
  console.log('Sample Data:', data[0]);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/bookings/self - CORS Failed:', err.message));

// Test 16: POST /api/bookings - Create a new booking
(async () => {
  const response = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    },
    body: JSON.stringify({ sessionId: 1 })
  });
  const data = await response.json();
  console.log('✅ POST /api/bookings - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 MySQL Data Created:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ POST /api/bookings - CORS Failed:', err.message));

// Test 17: DELETE /api/bookings/:id - Cancel a booking
(async () => {
  const response = await fetch(`${BASE_URL}/bookings/1`, {
    method: 'DELETE',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const data = await response.json();
  console.log('✅ DELETE /api/bookings/:id - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('Response:', data);
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ DELETE /api/bookings/:id - CORS Failed:', err.message));

// Test 18: GET /api/bookings/export/xml/history - Export member's booking history as XML
(async () => {
  const response = await fetch(`${BASE_URL}/bookings/export/xml/history`, {
    method: 'GET',
    headers: {
      'x-auth-key': AUTH_KEY,
      'x-test-header': 'cors-test' // Custom header triggers preflight
    }
  });
  const text = await response.text();
  console.log('✅ GET /api/bookings/export/xml/history - CORS Success!');
  console.log('Status:', response.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  console.log('📊 XML Data Retrieved:', text.substring(0, 200) + '...');
  console.log('📋 Check Network tab for OPTIONS preflight request');
})().catch(err => console.error('❌ GET /api/bookings/export/xml/history - CORS Failed:', err.message));
