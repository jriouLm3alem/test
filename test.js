const bcrypt = require('bcryptjs');

bcrypt.hash('mypassword', 10, (err, hash) => {
  if (err) throw err;
  console.log('Hashed password:', hash);
});