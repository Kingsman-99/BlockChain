const apiKey = "YOUR_ETHERSCAN_API_KEY";

document.getElementById("searchBtn").addEventListener("click", async () => {
    const query = document.getElementById("searchInput").value.trim();
    const resultDiv = document.getElementById("result");

    if (!query) {
        alert("Enter an address or tx hash");
        return;
    }

    resultDiv.innerHTML = "Loading...";

    try {
        if (query.startsWith("0x") && query.length === 42) {
            // It's an Ethereum address
            const balanceResp = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${query}&tag=latest&apikey=${apiKey}`);
            const balanceData = await balanceResp.json();
            const balance = (balanceData.result / 1e18).toFixed(4);

            const txResp = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${query}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`);
            const txData = await txResp.json();

            let html = `<h3>Address: ${query}</h3>`;
            html += `<p>Balance: ${balance} ETH</p>`;
            html += `<h4>Recent Transactions</h4>`;
            html += `<table>
                        <tr>
                            <th>Tx Hash</th>
                            <th>Block</th>
                            <th>Value (ETH)</th>
                        </tr>`;
            txData.result.slice(0,5).forEach(tx => {
                html += `<tr>
                            <td>${tx.hash}</td>
                            <td>${tx.blockNumber}</td>
                            <td>${(tx.value / 1e18).toFixed(4)}</td>
                        </tr>`;
            });
            html += `</table>`;

            resultDiv.innerHTML = html;

        } else if (query.startsWith("0x") && query.length === 66) {
            // It's a transaction hash
            const txResp = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${query}&apikey=${apiKey}`);
            const txData = await txResp.json();
            const tx = txData.result;

            let html = `<h3>Transaction: ${query}</h3>`;
            html += `<p>From: ${tx.from}</p>`;
            html += `<p>To: ${tx.to}</p>`;
            html += `<p>Value: ${parseInt(tx.value, 16) / 1e18} ETH</p>`;
            html += `<p>Gas: ${parseInt(tx.gas, 16)}</p>`;
            resultDiv.innerHTML = html;

        } else {
            resultDiv.innerHTML = "Invalid address or transaction hash";
        }
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = "Error fetching data";
    }
});
