 Factly Backend
=============

Factly is a web tool designed for extracting actionable insights from various types of inputs using the FIR approach (Facts => Insights => Recommendations). The backend of Factly is built with Node.js and Express.js, and it utilizes several libraries such as Keyv for data storage and Server-Sent Events for real-time updates.

Getting Started
---------------

To run the Factly backend, make sure you have Node.js installed on your system. Then, follow these steps:

1. Clone this repository to your local machine.
2. Run `npm install` in the project directory to install all dependencies.
3. Run `npm start` to start the server. The server will listen on port 3002 by default.

API Endpoints
-------------

- **POST /rooms** - Create a new room with the provided data and store it in the database. Returns the room ID.
- **GET /rooms/:id** - Retrieve the current state of a room by ID from the database.
- **DELETE /rooms/:id** - Stop a room, clear its contents from the database, and remove all subscribers.
- **GET /status** - Get real-time information about the number of connected clients in each active room.

Server-Sent Events Server
-------------------------

The Factly backend includes an implementation for Server-Sent Events (SSE), enabling real-time updates for users connected to a room. To use SSE, follow these steps:

1. Connect to the desired room by visiting `/events/:roomId` in your browser or using an HTTP client that supports Server-Sent Events (e.g., `curl --get "http://localhost:3002/events/<ROOM_ID>"`).
2. Provide a username as a query parameter, for example, `?username=JohnDoe`.
3. The server will establish a Server-Sent Events connection, allowing you to receive real-time updates from the room.

Data Storage
------------

Factly uses Keyv as its primary storage solution, with a Jetpack file system store for persisting data between server restarts. The CRUD operations (create, read, update, and delete) are implemented using Keyv's API.

Running Tests
-------------

To run tests for the Factly backend, execute `npm test` in the project directory.

Contributing
------------

Pull requests are welcome! For major changes, please open an issue first to discuss the proposed modifications.

License
-------

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/anasdox/factly-backend/blob/main/LICENSE) file for details.