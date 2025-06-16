const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");
const xml2js = require('xml2js');
const axios = require('axios');
const X2JS = require('x2js');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// OData Vendor Login
app.post("/vendorlogin", async (req, res) => {
    const { vendorId, password } = req.body;

    try {
        // Step 1: Get CSRF token
        const tokenResponse = await axios({
            method: 'GET',
            url: 'https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/',
            headers: {
                'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5',
                'X-CSRF-Token': 'Fetch'
            },
            httpsAgent: new (require('https')).Agent({
                rejectUnauthorized: false
            })
        });

        const csrfToken = tokenResponse.headers['x-csrf-token'];
        const cookies = tokenResponse.headers['set-cookie'];

        // Step 2: Use CSRF token for POST request
        const requestData = {
            VENDOR_ID: vendorId,
            PASSWORD: password
        };

        const options = {
            method: 'POST',
            url: 'https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VENDORLOGINSet',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': csrfToken,
                'Cookie': cookies ? cookies.join('; ') : ''
            },
            data: requestData,
            httpsAgent: new (require('https')).Agent({
                rejectUnauthorized: false
            })
        };

        const response = await axios(options);
        
        // Handle JSON response
        if (response.data && response.data.d) {
            res.send({
                vendorId: response.data.d.VENDOR_ID,
                message: response.data.d.RETURN,
                success: response.data.d.RETURN === 'Login successful'
            });
        } else {
            res.send(response.data);
        }
    } catch (error) {
        console.error("Request error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        return res.status(500).send({ error: "Request failed" });
    }
});

// OData Vendor Profile
app.post("/vendorprofile", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VENDORPROFILESet('${vendorId}')`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5',
            'Accept': 'application/json', // Try JSON first
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (response.statusCode === 404) {
            return res.status(404).send({ error: "Vendor not found" });
        }

        // Handle JSON or fallback to XML
        if (body.includes('<?xml')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "XML parsing failed", details: err.message });
                }

                const props = result?.entry?.content?.['m:properties'];
                if (!props) {
                    return res.status(404).send({ error: "Vendor profile not found" });
                }

                res.send({
                    vendorId: props['d:Lifnr'],
                    name: props['d:Name1'],
                    city: props['d:Orto1'],
                    country: props['d:Land1'],
                    postalCode: props['d:Pstlz'],
                    region: props['d:Regio'],
                    street: props['d:Stras'],
                    addressNumber: props['d:Adrnr']
                });
            });
        } else {
            try {
                const json = JSON.parse(body);
                const d = json?.d;
                if (!d) return res.status(404).send({ error: "Vendor profile not found" });

                res.send({
                    vendorId: d.Lifnr,
                    name: d.Name1,
                    city: d.Orto1,
                    country: d.Land1,
                    postalCode: d.Pstlz,
                    region: d.Regio,
                    street: d.Stras,
                    addressNumber: d.Adrnr
                });
            } catch (e) {
                res.status(500).send({ error: "Response parsing failed", details: e.message });
            }
        }
    });
});

//OData vendor RFQ
app.post("/vendorrfq", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorRFQSet?$filter=Lifnr eq '${vendorId}'`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // Your Base64 encoded credentials
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false // remove or replace with cert config in production
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No RFQs found
                }

                // Ensure array even if only one entry
                const rfqArray = Array.isArray(entries) ? entries : [entries];

                const parsedRFQs = rfqArray.map(entry => {
                    const props = entry['content']['m:properties'];
                    return {
                        ebeln: props['d:Ebeln'],
                        lifnr: props['d:Lifnr'],
                        bedat: props['d:Bedat'],
                        ebelp: props['d:Ebelp'],
                        matnr: props['d:Matnr'],
                        meins: props['d:Meins'],
                        txz01: props['d:Txz01']
                    };
                });

                res.send(parsedRFQs);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

//OData Vendor Purchase Order
app.post("/vendorpo", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorPOSet?$filter=Lifnr eq '${vendorId}'`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // 🔐 Replace with your credentials
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No Purchase Orders found
                }

                const poArray = Array.isArray(entries) ? entries : [entries];

                const parsedPOs = poArray.map(entry => {
                    const props = entry['content']['m:properties'];
                    return {
                        ebeln: props['d:Ebeln'],   // PO number
                        lifnr: props['d:Lifnr'],   // Vendor ID
                        bedat: props['d:Bedat'],   // Document Date
                        ebelp: props['d:Ebelp'],   // Item Number
                        matnr: props['d:Matnr'],   // Material Number
                        txz01: props['d:Txz01'],   // Description
                        meins: props['d:Meins'],   // Unit
                        netpr: props['d:Netpr'],   // Net Price
                        waers: props['d:Waers'],   // Currency
                        bstyp: props['d:Bstyp']    // PO Type
                    };
                });

                res.send(parsedPOs);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

//OData Vendor Goods Recipt
app.post("/vendorgr", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorGRSet?$filter=Lifnr eq '${vendorId}'`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // Replace with valid credentials
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No GRs found
                }

                const grArray = Array.isArray(entries) ? entries : [entries];

                const parsedGRs = grArray.map(entry => {
                    const props = entry['content']['m:properties'];
                    return {
                        mblnr: props['d:Mblnr'],   // Material Doc Number
                        mjahr: props['d:Mjahr'],   // Fiscal Year
                        ebeln: props['d:Ebeln'],   // Purchase Order
                        ebelp: props['d:Ebelp'],   // PO Item
                        matnr: props['d:Matnr'],   // Material Number
                        menge: props['d:Menge'],   // Quantity
                        meins: props['d:Meins'],   // Unit
                        budat: props['d:Budat'],   // Posting Date
                        lifnr: props['d:Lifnr'],   // Vendor ID
                        werks: props['d:Werks']    // Plant
                    };
                });

                res.send(parsedGRs);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

app.post("/vendorpay", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorPaySet?$filter=Lifnr eq '${vendorId}'`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // 🔐 Replace with real Base64 creds
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No Payment Records
                }

                const payArray = Array.isArray(entries) ? entries : [entries];

                const parsedPayments = payArray.map(entry => {
                    const props = entry['content']['m:properties'];
                    return {
                        lifnr: props['d:Lifnr'],     // Vendor ID
                        belnrD: props['d:BelnrD'],   // Document Number
                        budat: props['d:Budat'],     // Posting Date
                        cpudt: props['d:Cpudt'],     // Entry Date
                        dmbtr: props['d:Dmbtr'],     // Amount
                        waers: props['d:Waers'],     // Currency
                        dzfbdt: props['d:Dzfbdt'],   // Due Date
                        aging: props['d:Aging']      // Aging
                    };
                });

                res.send(parsedPayments);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

app.post("/vendormemo", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/vendorMemoSet?$filter=Lifnr eq '${vendorId}'`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // 🔐 Replace with real credentials
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No memo records
                }

                const memoArray = Array.isArray(entries) ? entries : [entries];

                const parsedMemos = memoArray.map(entry => {
                    const props = entry.content["m:properties"];
                    return {
                        lifnr: props["d:Lifnr"],     // Vendor ID
                        belnrD: props["d:BelnrD"],   // Document Number
                        budat: props["d:Budat"],     // Posting Date
                        cpudt: props["d:Cpudt"],     // Entry Date
                        blart: props["d:Blart"],     // Document Type (RE, etc.)
                        dmbtr: props["d:Dmbtr"],     // Amount
                        waers: props["d:Waers"],     // Currency
                        bukrs: props["d:Bukrs"],     // Company Code
                        shkzg: props["d:Shkzg"]      // Debit/Credit Indicator
                    };
                });

                res.send(parsedMemos);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

app.post("/vendorinvoicelist", (req, res) => {
    const { vendorId } = req.body;

    if (!vendorId) {
        return res.status(400).send({ error: "Vendor ID is required" });
    }

   const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorInvoiceListSet?$filter=Lifnr%20eq%20'${vendorId}'`;
    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // 🔐 Replace with actual credentials
            'Accept': 'application/atom+xml',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("Request error:", error);
            return res.status(500).send({ error: "Request failed", details: error.message });
        }

        if (body.includes('<feed')) {
            xml2js.parseString(body, { explicitArray: false }, (err, result) => {
                if (err) {
                    return res.status(500).send({ error: "Failed to parse XML", details: err.message });
                }

                const entries = result.feed.entry;
                if (!entries) {
                    return res.send([]); // No records found
                }

                const invoiceArray = Array.isArray(entries) ? entries : [entries];

                const parsedInvoices = invoiceArray.map(entry => {
                    const props = entry.content["m:properties"];
                    return {
                        lifnr: props["d:Lifnr"],      // Vendor ID
                        belnrD: props["d:BelnrD"],    // Invoice Number
                        budat: props["d:Budat"],      // Posting Date
                        waers: props["d:Waers"],      // Currency
                        wrbtr: props["d:Wrbtr"],      // Amount
                        gjahr: props["d:Gjahr"]       // Fiscal Year
                    };
                });

                res.send(parsedInvoices);
            });
        } else {
            res.status(500).send({ error: "Unexpected response format", body });
        }
    });
});

app.post("/vendorform", (req, res) => {
    const { vendorId, invoiceNumber } = req.body;

    if (!vendorId || !invoiceNumber) {
        return res.status(400).send({ error: "Vendor ID and Invoice Number are required" });
    }

    const odataUrl = `https://AZKTLDS5CP.kcloud.com:44300/sap/opu/odata/sap/ZODATA_VENDOR_PM_SRV/VendorInvoiceFormSet(LIFNR='${vendorId}',BELNR_D='${invoiceNumber}')/$value`;

    const options = {
        method: 'GET',
        url: odataUrl,
        headers: {
            'Authorization': 'Basic SzkwMTUwMzpQcmFkZWlzaDI5', // 🔐 Replace with actual credentials
            'Accept': 'application/pdf',
            'X-Requested-With': 'XMLHttpRequest'
        },
        strictSSL: false,
        encoding: null // <- Important to get binary response
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("PDF fetch error:", error);
            return res.status(500).send({ error: "PDF request failed", details: error.message });
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=invoice.pdf',
            'Content-Length': body.length
        });

        res.send(body);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SAP OData Vendor Service running on http://localhost:${PORT}`);
});