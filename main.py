from flask import Flask, render_template, escape, jsonify
from compare import lagging, INSTITUITIONS

app = Flask(__name__)

@app.route('/')
def index():
  return render_template('index.html')

@app.route('/api/<name>/<target>/<other>/<cutoff>')
def result(name, target, other, cutoff):
  name = escape(name)
  target = escape(target)
  try:
    return jsonify({'data': lagging(name, target, other, int(cutoff))})
  except ValueError:
    return jsonify({'error': 'Invalid `name` or `instituition`'}), 500
  except Exception:
    return jsonify({'error': 'Uh oh! Looks like the server crashed. Contact the developers!'}), 500

if __name__ == '__main__':
  app.run(debug=True)