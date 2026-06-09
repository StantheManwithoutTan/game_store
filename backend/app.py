from flask import Flask

# crea la aplicacion de flask
app = Flask(__name__)

# asigna la ruta de '/' al url de la funcion
@app.route('/')
def hello_world():
    return 'Hello World'

# inicia el servidor local
if __name__ == '__main__':
    app.run()

