const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");

const app = express();
const port = 3001;
app.use(cors());

// Database configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "kavindu123",
  database: "ABCBank",
  port: 3306,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Middleware to parse JSON
app.use(bodyParser.json());

//fixed deposit checker
const myFunction = () => {
  console.log("Running every 200 seconds...");

  // Get today's date in YYYY-MM-DD format
  const todayDate = new Date().toISOString().split("T")[0];
  console.log(todayDate);

  // SQL query to select fixed deposits with withdrawal date equal to today's date
  const sql = `SELECT * FROM fixeddeposit WHERE DATE(date_of_withdrawal) = '${todayDate}'`;
  const query =
    "INSERT INTO savings (user_id, amount, transferred_from_user_id, transferred_from) VALUES (?, ?, null, ?)";
  const deleteQuery = "DELETE FROM fixeddeposit WHERE fixeddepositid = ?";

  // Execute the query
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing SQL query:", err);
    } else {
      // If there are results, filter and log the required information for each user
      if (results.length > 0) {
        console.log(
          "Fixed deposits with withdrawal date equal to today's date:"
        );
        results.forEach((row) => {
          console.log(
            `User ID: ${row.user_id}, Amount: ${row.amount}, Interest Rate: ${row.interest_rate}`
          );
          const interest =
            parseFloat(row.amount) * (parseFloat(row.interest_rate) / 100 + 1);
          db.query(
            query,
            [row.user_id, interest, "Fixed deposit withdrawal"],
            (err, results) => {
              if (err) {
                console.error("Error inserting into savings:", err);
              } else {
                db.query(deleteQuery, [row.fixeddepositid], (err, results) => {
                  if (err) {
                    console.error("Error deleting from fixed deposit:", err);
                  } else {
                    console.log("Fixed deposit deleted successfully");
                  }
                });
              }
            }
          );
        });
      } else {
        console.log(
          "No fixed deposits with withdrawal date equal to today's date."
        );
      }
    }
  });
};

//shedule payment
const shedulepaymentFunc = () => {
  console.log("Running every 200 seconds...");

  // Get today's date in YYYY-MM-DD format
  const todayDate = new Date().toISOString().split("T")[0];
  console.log(todayDate);

  // SQL query to select fixed deposits with withdrawal date equal to today's date
  const sql = `SELECT * FROM schedule_payment WHERE DATE(date_of_plan_to_transfer) = '${todayDate}'`;
  const query =
    "INSERT INTO savings (user_id, amount, transferred_from_user_id, transferred_from) VALUES (?, ?, ?, ?)";
  const deleteQuery = "DELETE FROM schedule_payment WHERE sheduleid = ?";

  // Execute the query
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing SQL query:", err);
    } else {
      // If there are results, filter and log the required information for each user
      if (results.length > 0) {
        console.log(
          "shedule paymet with withdrawal date equal to today's date:"
        );
        results.forEach((row) => {
          console.log(
            `User ID of transfer : ${row.user_id}, Amount: ${row.amount}, user id of reciver  ${row.user_id_of_receiver}`
          );

          db.query(
            query,
            [
              row.user_id_of_receiver,
              row.amount,
              row.user_id,
              "Scheduled Payment by " + row.user_id,
            ],
            (err, results) => {
              if (err) {
                console.error("Error inserting into savings:", err);
              } else {
                db.query(deleteQuery, [row.sheduleid], (err, results) => {
                  if (err) {
                    console.error("Error deleting from fixed deposit:", err);
                  } else {
                    console.log("Fixed deposit deleted successfully");
                  }
                });
              }
            }
          );
        });
      } else {
        console.log(
          "No shedule paymnet with withdrawal date equal to today's date."
        );
      }
    }
  });
};

// Run the function every 200 seconds
setInterval(myFunction, 200000);
setInterval(shedulepaymentFunc, 200000);
// Endpoint to handle user signup
app.post("/api/signup", (req, res) => {
  const {
    first_name,
    last_name,
    street,
    city,
    province,
    birthday,
    phone_number,
    national_id,
    username,
    password,
    branch,
  } = req.body;

  // Hash the password using bcrypt
  const hashedPassword = bcrypt.hashSync(password, 10);
  const branch_number = branch;
  const query =
    "INSERT INTO users (first_name, last_name, street, city, province, birthday, phone_number, national_id, username, password_hash, branch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    query,
    [
      first_name,
      last_name,
      street,
      city,
      province,
      birthday,
      phone_number,
      national_id,
      username,
      hashedPassword,
      branch_number,
    ],
    (err, results) => {
      if (err) {
        console.error("Error inserting user:", err);

        // Check if the error is a duplicate entry error
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(400)
            .json({ error: "Duplicate entry. User already exists." });
        }

        res.status(500).json({ error: "Internal Server Error" });
      } else {
        console.log("User inserted successfully");

        // Send back the received data in the response
        res.status(201).json({
          message: "User created successfully",
          userData: {
            first_name,
            last_name,
            street,
            city,
            province,
            birthday,
            phone_number,
            national_id,
            username,
            branch,
          },
        });
      }
    }
  );
});

//handle the loging
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ?";

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      // Check if the user with the given username exists
      if (results.length > 0) {
        const user = results[0];

        // Compare the provided password with the hashed password in the database
        const passwordMatch = bcrypt.compareSync(password, user.password_hash);

        if (passwordMatch) {
          // If passwords match, send success response with user details
          res.status(200).json({
            message: "Login successful",
            userData: {
              id: user.user_id, // Assuming there is a column named 'id' in your users table
              username: user.username,
              // Add other user details you want to include in the response
            },
          });
        } else {
          // If passwords don't match, send error response
          res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        // If the user with the given username doesn't exist, send error response
        res.status(401).json({ error: "Invalid credentials" });
      }
    }
  });
});

//handle the loging when is on then create new window for that pass the id of user
// Assuming you have a '/api/user/:id' endpoint to get user details by ID
app.get("/api/user/:id", (req, res) => {
  const userId = req.params.id;

  // Fetch user details from the database based on the user ID
  const query = "SELECT * FROM users WHERE user_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (results.length > 0) {
        const user = results[0];
        res.status(200).json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    }
  });
});

// Endpoint to get the total balance for a user
app.get("/api/user/:id/totalbalance", (req, res) => {
  const userId = req.params.id;
  console.log(userId);
  // Fetch total balance from the savings table based on user ID
  const query =
    "SELECT COALESCE(SUM(amount), 0) AS total_balance FROM savings WHERE user_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (results.length > 0) {
        const totalBalance = results[0].total_balance;
        console.log(totalBalance);
        res.status(200).json({ total_balance: totalBalance });
      } else {
        res
          .status(404)
          .json({ error: "User not found or no savings data available" });
      }
    }
  });
});

// Endpoint to get the total balance for a user for forign currency
app.get("/api/user/:id/totalbalanceforign", (req, res) => {
  const userId = req.params.id;
  console.log(userId);
  // Fetch total balance from the savings table based on user ID
  const query =
    "SELECT COALESCE(SUM(amount), 0) AS total_balance FROM forignSavings WHERE user_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (results.length > 0) {
        const totalBalance = results[0].total_balance;
        console.log(totalBalance);
        res.status(200).json({ total_balance: totalBalance });
      } else {
        res
          .status(404)
          .json({ error: "User not found or no savings data available" });
      }
    }
  });
});

// Endpoint to validate user credentials
app.post("/api/validate-user", (req, res) => {
  const { username, password } = req.body;
  console.log(username);
  // Check if the provided username and password match a user in the database
  const query = "SELECT * FROM users WHERE username = ?";

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (results.length > 0) {
        const user = results[0];

        // Compare the provided password with the hashed password in the database
        const passwordMatch = bcrypt.compareSync(password, user.password_hash);

        if (passwordMatch) {
          // User credentials are valid
          res.status(200).json({ message: "User validated successfully" });
        } else {
          // Invalid credentials
          res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        // If the user with the given username doesn't exist, send error response
        res.status(401).json({ error: "Invalid credentials" });
      }
    }
  });
});

//get the saving history transaction
app.post("/api/historyofsavings", (req, res) => {
  const { user_id } = req.body;

  console.log(user_id);
  // Check if the provided username and password match a user in the database
  const query = "SELECT * FROM savings WHERE user_id=?";

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
    console.log(results);
    res.json({ results });
  });
});

//get the card details from the databsae
app.post("/api/cardDeatils", (req, res) => {
  const { user_id } = req.body;

  console.log(user_id);
  // Check if the provided username and password match a user in the database
  const query = "SELECT * FROM credit_cards WHERE user_id=?";

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
    console.log(results);
    res.json({ results });
  });
});

//get the users details from the databsae
app.post("/api/searchofuser", (req, res) => {
  const { name } = req.body;

  // Check if the provided username and password match a user in the database
  const query =
    "SELECT users.*, GROUP_CONCAT(credit_cards.card_number) AS card_numbers " +
    "FROM users " +
    "LEFT JOIN credit_cards ON users.user_id = credit_cards.user_id " +
    "WHERE users.first_name LIKE ? OR users.last_name LIKE ? " +
    "GROUP BY users.user_id";

  db.query(query, [`%${name}%`, `%${name}%`], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log(results);
    res.json({ results });
  });
});

//create the debitcard
app.post("/api/createdebitcard", (req, res) => {
  const { card_number, cvv, user_id, exp_data } = req.body;

  // Check if the provided username and password match a user in the database
  const query =
    "INSERT INTO credit_cards (card_number,cvv,user_id,exp_date) VALUES (?,?,?,?)";

  db.query(query, [card_number, cvv, user_id, exp_data], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
    console.log(results);
    res.json({ message: "sucessfully added the card", results });
  });
});

//add money to the wallet
app.post("/api/add-to-savings", (req, res) => {
  const { user_id, amount } = req.body;
  console.log(user_id, amount);
  let deposite = "Direct Deposit"; // Use let instead of const for reassignment

  if (amount < 0) {
    deposite = "CRM direct withdraw";
  }

  // Insert the transaction into the savings table
  const query =
    "INSERT INTO savings (user_id, amount, transferred_from_user_id, transferred_from) VALUES (?, ?, null, ?)";

  db.query(query, [user_id, amount, deposite], (err, results) => {
    if (err) {
      console.error("Error inserting into savings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      // Transaction successful
      res.status(201).json({ message: "Amount added to savings successfully" });
    }
  });
});

//shedule payment
app.post("/api/shedulepayment", (req, res) => {
  const {
    user_id_transaction,
    amount,
    user_id_reciver,
    date_of_payment_willing_pay,
  } = req.body;

  console.log(
    user_id_reciver,
    user_id_transaction,
    amount,
    date_of_payment_willing_pay
  );
  // Insert the transaction into the savings table
  const query =
    "INSERT INTO schedule_payment (user_id, amount, user_id_of_receiver, date_of_plan_to_transfer) VALUES (?, ?, ?, ?)";

  const quer1 =
    "INSERT INTO savings (user_id, amount, transferred_from_user_id, transferred_from) VALUES (?,?,?,?)";

  db.query(
    query,
    [user_id_transaction, amount, user_id_reciver, date_of_payment_willing_pay],
    (err, results) => {
      if (err) {
        console.error("Error inserting into savings:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        db.query(quer1, [
          user_id_transaction,
          -amount,
          user_id_reciver,
          "shedule payment",
        ]);
        // Transaction successful
        res
          .status(201)
          .json({ message: "Amount added to schedule payment successfully" });
      }
    }
  );
});

//tranfer from user
app.post("/api/transfertoanotheruser", (req, res) => {
  const {
    user_id,
    amount,
    transferred_from_user_id,
    transferred_from,
    recevername,
  } = req.body;
  console.log(user_id, amount, transferred_from_user_id, transferred_from);
  const transfer = "tranfer to" + recevername + " and IDNUMBER::" + user_id;
  // Insert the transaction into the savings table
  const query =
    "INSERT INTO savings (user_id, amount,transferred_from_user_id,transferred_from) VALUES (?, ?,?,?)";
  const query2 =
    "INSERT INTO savings (user_id, amount,transferred_from_user_id,transferred_from) VALUES (?, ?,?,?)";
  db.query(
    query,
    [user_id, amount, transferred_from_user_id, transferred_from],
    (err, results) => {
      if (err) {
        console.error("Error inserting into savings:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        // Transaction successful
        res
          .status(201)
          .json({ message: "Amount added to savings successfully" });
        db.query(query2, [
          transferred_from_user_id,
          -amount,
          user_id,
          transfer,
        ]);
      }
    }
  );
});

//forign exchnage rate
app.post("/api/forigncurrencyexchange", (req, res) => {
  const { amount, user_id, usdExchnagerate } = req.body;
  console.log(usdExchnagerate);
  const USDamount = parseFloat(amount) / parseFloat(usdExchnagerate);
  const transfer = "Trnsfer for Exchnage the money with USD";
  // Insert the transaction into the savings table
  const query =
    "INSERT INTO forignSavings (user_id, amount, exchange_rate)  VALUES (?, ?,?)";
  const query2 =
    "INSERT INTO savings (user_id, amount,transferred_from_user_id,transferred_from) VALUES (?, ?,?,?)";
  db.query(query, [user_id, USDamount, usdExchnagerate], (err, results) => {
    if (err) {
      console.error("Error inserting into savings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      // Transaction successful
      res.status(201).json({ message: "Amount added to savings successfully" });
      db.query(query2, [user_id, -amount, user_id, transfer]);
    }
  });
});

//fixed deposite api
app.post("/api/fixeddeposite", (req, res) => {
  const {
    user_id,
    amount,
    date_of_deposit,
    date_of_withdrawal,
    interest_rate,
  } = req.body;
  console.log(req.body);
  const transerName = "Deposite to Fixed deposite";
  // Insert the transaction into the savings table
  const query =
    "INSERT INTO fixeddeposit (user_id, amount, date_of_deposit,date_of_withdrawal,interest_rate)  VALUES (?, ?,?,?,?)";
  const query2 =
    "INSERT INTO savings (user_id, amount,transferred_from_user_id,transferred_from) VALUES (?, ?,?,?)";
  db.query(
    query,
    [user_id, amount, date_of_deposit, date_of_withdrawal, interest_rate],
    (err, results) => {
      if (err) {
        console.error("Error inserting into savings:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        // Transaction successful
        res
          .status(201)
          .json({ message: "Amount added to savings successfully" });
        db.query(query2, [user_id, -amount, user_id, transerName]);
      }
    }
  );
});

//fixed deposite get data
app.post("/api/fixeddepositeGetdata", (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);

  const query = "SELECT * FROM fixeddeposit WHERE user_id=?";

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error inserting into savings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      // Transaction successful
      console.log(results);
      res.json({ results: results });
    }
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//admin page login
app.post("/api/adminlogin", (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  const query = "SELECT * FROM employee WHERE name=? and id_number=?";

  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Error inserting into savings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      if (results.length > 0) {
        console.log("logged");
        console.log(results[0].employee_id);
        res.json({ results: "logged", empId: results[0].employee_id });
      } else {
        res.json({ results: "notAdmin" });
      }
    }
  });
});

app.post("/api/admindatafetch", (req, res) => {
  const { emp_id } = req.body;
  const query =
    "select position.position_of_employee from employee,position where employee.employee_id=position.employee_id and employee.employee_id=?";

  db.query(query, [emp_id], (err, results) => {
    if (err) {
      console.error("Error inserting into savings:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(results);
      if (results[0].position_of_employee == "Assistant") {
        console.log("Assistant");
        res.json({ data: "Assistant" });
      } else if (results[0].position_of_employee == "Manager") {
        console.log("Manager");
        res.json({ data: "Manager" });
      } else if (results[0].position_of_employee == "Supervisor") {
        console.log("Supervisor");
        res.json({ data: "Supervisor" });
      } else {
        console.log("havenot authority to enter");
      }
    }
  });
});

app.post("/api/userckerinadmin", (req, res) => {
  const { searchinput } = req.body;
  const query =
    "SELECT * FROM users WHERE first_name LIKE ? OR last_name LIKE ? OR birthday LIKE ? OR phone_number LIKE ? OR national_id LIKE ?";

  const searchTerm = `%${searchinput}%`; // Add '%' around the search input

  db.query(
    query,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    (err, results) => {
      if (err) {
        console.error("Error querying the database:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        console.log(results);
        res.status(200).json(results); // Send the results back as a response
      }
    }
  );
});

app.post("/api/getTotalsavings", (req, res) => {
  const query =
    "SELECT  sum(amount) as sum FROM ABCBank.savings where transferred_from='Direct Deposit' or transferred_from='CRM direct withdraw'";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(results);
      res.status(200).json(results); // Send the results back as a response
    }
  });
});

app.post("/api/getSavingsAsMonthly", (req, res) => {
  const query =
    "SELECT sum(amount) as sum, DATE(transaction_date) as transaction_date FROM ABCBank.savings WHERE transferred_from='Direct Deposit' OR transferred_from='CRM direct withdraw' GROUP BY DATE(transaction_date)";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(results);
      res.status(200).json(results); // Send the results back as a response
    }
  });
});

app.post("/api/editthedata", (req, res) => {
  const {
    user_id,
    first_name,
    last_name,
    street,
    city,
    province,
    birthday,
    phone_number,
    national_id,
  } = req.body;

  // Format the birthday
  const formattedBirthday = new Date(birthday).toISOString().split("T")[0];

  console.log(
    user_id,
    first_name,
    last_name,
    street,
    city,
    province,
    formattedBirthday,
    phone_number,
    national_id
  );

  // Hash the password using bcrypt

  const query =
    "UPDATE users SET first_name = ?, last_name = ?, street = ?, city = ?, province = ?, birthday = ?, phone_number = ?, national_id = ? WHERE user_id = ?";

  db.query(
    query,
    [
      first_name,
      last_name,
      street,
      city,
      province,
      formattedBirthday, // Use the formatted birthday here
      phone_number,
      national_id,
      user_id,
    ],
    (err, results) => {
      if (err) {
        console.error("Error querying the database:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        console.log(results);
        res.status(200).json(results); // Send the results back as a response
      }
    }
  );
});

app.post("/api/getSchedulepayment", (req, res) => {
  const { user_id } = req.body;
  const query = "select * from schedule_payment where user_id=?";
  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(results);
      res.status(200).json(results); // Send the results back as a response
    }
  });
});

app.post("/api/getTotaluser", (req, res) => {
  const { user_id } = req.body;
  const query = "select count(user_id) as countUser from users";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(results);
      res.status(200).json(results); // Send the results back as a response
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
