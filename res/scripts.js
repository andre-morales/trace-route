let $tableBody;

function main() {
	let $input = document.getElementsByTagName('input')[0];
	let $traceBtn = document.getElementsByTagName('button')[0];
	$tableBody = document.getElementsByTagName('tbody')[0];
	$traceBtn.onclick = () => {
		trace($input.value);
	};
}

async function trace(address) {
	console.log(`Tracing '${address}'...`);

	// Fetch trace API
	let fRes = await fetch("/trace?addr=" + address);
	if (!fRes.ok) {
		console.error("Tracing failed!");
		return;
	}

	let reader = fRes.body.getReader();
	let decoder = new TextDecoder('utf-8');
	let buffer = '';
	while (true) {
		// Await arrival of chunked data
		let result = await reader.read();

		// Try converting the chunk into a string. 
		let chunk = decoder.decode(result.value, { stream: !reader.done });
		if (chunk) {
			buffer += chunk;
			let lines = buffer.split('\n');
			for (let i = 0; i < lines.length - 1; i++) {
				let hopLine = lines[i];
				let hopData = hopLine.split('  ').filter(str => str.trim());

				let hopNum = hopData[0];
				let address = hopData[4];

				hop(hopNum, address);
			}

			buffer = lines[lines.length - 1];
		}

		if (result.done) break;
	}
}

function hop(num, address) {
	$tableBody.innerHTML += `<tr><td>${num}</td> <td>${address}</td></tr>`;
}
