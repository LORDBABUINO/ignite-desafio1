const express = require('express');
const cors = require('cors');

const { v4: uuidv4 } = require('uuid');

const app = express();

const users = [];

// Helpers

const buildChecker = (local) => (paramName) => (request) => (object) =>
  object[paramName] === request[local][paramName]
const checksUsername = buildChecker('headers')('username')
const checksId = buildChecker('params')('id')
const getTodo = (request) => users.find(checksUsername(request)).todos
const buildMiddleware = (condition) => (error) => (request, response, next) =>
  condition(request) ? next() : response.status(404).json({ error })
const todoSplice = (request, callback) => {
  const todoList = getTodo(request)
  const todoIndex = todoList.findIndex(checksId(request))
  if(callback) {
    const todo = callback(todoList[todoIndex])
    todoList.splice(todoIndex, 1, todo)
    return todo
  } else {
    todoList.splice(todoIndex, 1)
  }
}

// Middlewares

const checksExistsUserAccount =
  buildMiddleware(request => users.some(checksUsername(request)))('User does not exist')

const checksExistsTask =
  buildMiddleware(request => getTodo(request).some(checksId))('Task does not exist')

// Routes

app.use(cors());
app.use(express.json());

app.post('/users', (request, response) => {
  if(users.some(buildChecker('body')('username')(request)))
    return response.status(400).json({ error: 'User already exists' })
  const user = { id: uuidv4(), todos: [], ...request.body }
  users.push(user)
  return response.status(201).json(user)
});

app.use(checksExistsUserAccount)

app.get('/todos', (request, response) => response.json(getTodo(request)))

app.post('/todos', (request, response) => {
  const todo = { id: uuidv4(), done: false, ...request.body, created_at: new Date() }
  getTodo(request).push(todo)
  return response.status(201).json(todo)
});

app.put('/todos/:id', checksExistsTask, (request, response) => response.json(
  todoSplice(request, (todo) => ({ ...todo, ...request.body }))
));

app.patch('/todos/:id/done', checksExistsTask, (request, response) => {
  const todo = getTodo(request).find(checksId(request))
  todo.done = true
  return response.json(todo)
});

app.delete('/todos/:id', checksExistsTask, (request, response) => {
  todoSplice(request)
  return response.status(204).end()
});

module.exports = app;