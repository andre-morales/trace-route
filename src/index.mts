import Express from 'express'
import ChildProc from 'node:child_process'

var app: Express.Application;

function main() {
	app = Express();
	app.use(Express.static('res'));

	app.get('/trace', async (req, res) => {
		let address = req.query.addr as string;
		let tracer = new RouteTracer(address);
		tracer.setResponse(res);
		await tracer.doTrace();
		res.end();
	});

	app.listen(7100);
	console.log("Listening for connections...");
}

class RouteTracer {
	public address: string;
	private responseObject: Express.Response;

	constructor(address: string) {
		this.address = address;
	}

	doTrace(): Promise<void> {
		let deferredResolve: any;
		let deferred = new Promise<void>((res, rej) => {deferredResolve = res;});

		let buffer = '';
		let proc = ChildProc.spawn('tracert', [this.address]);
		proc.stdout.on('data', (data) => {
			// Store the data in the buffer
			buffer += data.toString();
			
			// Process all the lines in the buffer except for the last one which is incomplete.
			let lines = buffer.split('\n');
			for (let i = 0; i < lines.length - 1; i++) {
				this.handleInputLine(lines[i]);
			}
			
			// Reset the buffer to only contain the last line 
			buffer = lines[lines.length - 1];
		});

		proc.on('exit', () => {
			console.log("Tracing finished.");
			deferredResolve();
		});

		console.log('Tracing ' + this.address);
		return deferred;
	}

	setResponse(res: Express.Response) {
		this.responseObject = res;
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked'
		});
	}
	
	handleInputLine(line: string) {
		// Ignore lines that don't represent any hops.
		if (line.match(/^\s\s\d+\s\s/m) == null) return;

		console.log(line);
		this.responseObject.write(line + '\n');
	}
}

main();