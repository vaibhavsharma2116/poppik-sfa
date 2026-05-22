
const axios = require('axios');

async function testLogin() {
  try {
    console.log("Testing login...");
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      phone: "8888888888",
      password: "sales123"
    });
    console.log("Login successful:", response.data);
  } catch (error) {
    console.error("Login error:", error.response ? error.response.data : error.message);
    if (error.response) {
      console.error("Status code:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

testLogin();
