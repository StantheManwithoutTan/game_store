from flask import Flask, request, render_template

# crea la aplicacion de flask
app = Flask(__name__)

# asigna la ruta de '/' al url de la funcion
@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        name = request.form['username']
        return f"Hello {name}, POST request received"
    return render_template('name.html')

# inicia el servidor local
if __name__ == '__main__':
    app.run(debug=True)

