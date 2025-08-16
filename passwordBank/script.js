document.getElementById("encryptBtn").onclick = function () {
  let txt = document.getElementById("text").value;
  let pwd = document.getElementById("password").value;
  if (txt === "" || pwd === "") {
    alert("Enter both text and secret code.");
    return;
  }
  let ciphertext = CryptoJS.AES.encrypt(txt, pwd).toString();
  document.getElementById("result").value = ciphertext;
};
document.getElementById("decryptBtn").onclick = function () {
  let txt = document.getElementById("text").value;
  let pwd = document.getElementById("password").value;
  if (txt === "" || pwd === "") {
    alert("Enter both text/cipher and secret code.");
    return;
  }
  try {
    let bytes = CryptoJS.AES.decrypt(txt, pwd);
    let decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("Wrong key or invalid cipher text.");
    document.getElementById("result").value = decrypted;
  } catch (e) {
    document.getElementById("result").value =
      "Wrong key or invalid encrypted text.";
  }
};

$(function () {
  // --- Utilities ---
  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Collapsible fieldsets toggle
  $("fieldset > legend").click(function () {
    $(this).parent().toggleClass("collapsed");
  });

  // CKEditor instances tracking for various dynamic editors
  const secretKeyEditors = new Map();
  const walletContainerDescEditors = new Map();
  const subtableDescEditors = new Map();
  const additionalDescEditors = new Map();

  // --------------------
  // SECRET KEYS
  // --------------------
  const secretKeysContainer = $("#secretKeysContainer");
  function addSecretKey(
    data = {
      Name: "",
      SecretCode: "",
      SecretMessage: "",
      "Additional Info": "",
    }
  ) {
    const card = $(`
  <div class="card mb-3 secretKeyCard">
    <div class="card-body">
      <div class="col-md-1 d-flex align-items-start mt-2">
        <button type="button" class="btn btn-danger btn-sm deleteSecretKeyBtn">Delete</button>
      </div>
      <div class="row g-2 mt-2">
          <div class="d-flex gap-2">
              <div class="col-md-6"><input type="text" class="form-control form-control-sm secretName" placeholder="Name" value="${escapeHtml(
                data.Name
              )}"/></div>
              <div class="col-md-6"><input type="text" class="form-control form-control-sm secretCode" placeholder="Secret Code" value="${escapeHtml(
                data.SecretCode
              )}"/></div>
          </div>
          <div class="d-flex gap-2 mt-2">
              <div class="col-md-6"><textarea class="form-control secretMessage" placeholder="Secret Message">${escapeHtml(
                data.SecretMessage
              )}</textarea></div>
              <div class="col-md-6"><textarea class="form-control additionalInfo" placeholder="Additional Info">${escapeHtml(
                data["Additional Info"]
              )}</textarea></div>
          </div>
      </div>
    </div>
  </div>`);
    secretKeysContainer.append(card);

    // Initialize CKEditor for Secret Message & Additional Info
    ClassicEditor.create(card.find("textarea.secretMessage")[0])
      .then((editor) =>
        secretKeyEditors.set(card[0], { secretMessage: editor })
      )
      .catch(console.error);
    ClassicEditor.create(card.find("textarea.additionalInfo")[0])
      .then((editor) => {
        if (!secretKeyEditors.has(card[0]))
          secretKeyEditors.set(card[0], {});
        secretKeyEditors.get(card[0]).additionalInfo = editor;
      })
      .catch(console.error);

    card.find(".deleteSecretKeyBtn").click(() => {
      if (secretKeyEditors.has(card[0])) {
        const editors = secretKeyEditors.get(card[0]);
        if (editors.secretMessage) editors.secretMessage.destroy();
        if (editors.additionalInfo) editors.additionalInfo.destroy();
        secretKeyEditors.delete(card[0]);
      }
      card.remove();
    });
  }

  // --------------------
  // GMAIL THINGS
  // --------------------
  const walletContainerContainerContainer = $(
    "#walletContainerContainerContainer"
  );

  function addWalletContainer(
    data = { Wallet: "", Desc: "", Subtable: [] }
  ) {
    const card = $(`
  <div class="card mb-3 walletContainerContainerCard">
    <div class="card-body">
      <div class="row g-2 align-items-center mb-2">
        <div class="col-md-4"><input type="email" class="form-control form-control-sm walletContainerEmail" placeholder="Wallet Header" value="${escapeHtml(
          data.Wallet
        )}"/></div>
        <div class="col-md-7"><textarea class="form-control walletContainerDesc" placeholder="Description">${escapeHtml(
          data.Desc
        )}</textarea></div>
        <div class="col-md-1 text-end">
          <button type="button" class="btn btn-danger btn-sm deleteWalletContainerBtn">Delete</button>
        </div>
      </div>
      <div class="subtablesContainer"></div>
      <button type="button" class="btn btn-secondary btn-sm addSubtableBtn mb-2">+ Add Subtable</button>
    </div>
  </div>`);
    walletContainerContainerContainer.append(card);

    // Initialize CKEditor for Wallet Desc
    ClassicEditor.create(card.find("textarea.walletContainerDesc")[0])
      .then((editor) => walletContainerDescEditors.set(card[0], editor))
      .catch(console.error);

    // Delete Wallet Container
    card.find(".deleteWalletContainerBtn").click(() => {
      const ed = walletContainerDescEditors.get(card[0]);
      if (ed) ed.destroy();
      walletContainerDescEditors.delete(card[0]);
      // Also destroy all subtable editors
      card.find(".subtableCard").each(function () {
        destroySubtableEditors(this);
      });
      card.remove();
    });

    // Add Subtable
    const subtablesContainer = card.find(".subtablesContainer");
    card
      .find(".addSubtableBtn")
      .click(() => addSubtable(subtablesContainer));

    // Load subtables if data present
    if (Array.isArray(data.Subtable)) {
      for (const subdata of data.Subtable) {
        addSubtable(subtablesContainer, subdata);
      }
    }
  }

  // Subtable add function
  function addSubtable(
    container,
    data = {
      website: "",
      websiteurl: "",
      usernamenamethings: [],
      passwordthings: [],
      descdetails: [],
    }
  ) {
    const card = $(`
  <div class="card mb-3 subtableCard">
    <div class="card-body">
      <div class="row g-2 mb-2 align-items-center">
        <div class="col-md-3"><input type="text" class="form-control form-control-sm websiteInput" placeholder="Website" value="${escapeHtml(
          data.website
        )}"/></div>
        <div class="col-md-4"><input type="url" class="form-control form-control-sm websiteUrlInput" placeholder="Website URL" value="${escapeHtml(
          data.websiteurl
        )}"/></div>
        <div class="col-md-1 text-end">
          <button type="button" class="btn btn-danger btn-sm deleteSubtableBtn">Delete</button>
        </div>
      </div>

      <div class="mb-2">
        <span class="d-flex justify-content-between align-items-center pb-1">
          <strong>Usernames</strong>
          <button type="button" class="btn btn-sm btn-outline-primary addUsernameBtn mt-1">+ Add Username</button>
        </span>
        <div class="usernamesContainer"></div>
      </div>

      <div class="mb-2">
      <span class="d-flex justify-content-between align-items-center pb-1">
        <strong>Passwords</strong>
        <button type="button" class="btn btn-sm btn-outline-primary addPasswordBtn mt-1">+ Add Password</button>
      </span>
        <div class="passwordsContainer"></div>
      </div>

      <div class="mb-2">
        <strong>Description Details</strong>
        <textarea class="form-control descDetailsTextarea"></textarea>
      </div>
    </div>
  </div>
`);
    container.append(card);

    // Init CKEditor for descDetails textarea
    ClassicEditor.create(card.find("textarea.descDetailsTextarea")[0])
      .then((editor) => subtableDescEditors.set(card[0], editor))
      .catch(console.error);

    // Delete subtable
    card.find(".deleteSubtableBtn").click(() => {
      destroySubtableEditors(card[0]);
      card.remove();
    });

    // Add Username key-value pairs
    const usernamesContainer = card.find(".usernamesContainer");
    card
      .find(".addUsernameBtn")
      .click(() => addKeyValueRow(usernamesContainer, "username"));

    // Add Password key-value pairs
    const passwordsContainer = card.find(".passwordsContainer");
    card
      .find(".addPasswordBtn")
      .click(() => addKeyValueRow(passwordsContainer, "password"));

    // Load existing usernames
    if (Array.isArray(data.usernamenamethings)) {
      for (const kv of data.usernamenamethings) {
        addKeyValueRow(usernamesContainer, "username", kv);
      }
    }
    // Load existing passwords
    if (Array.isArray(data.passwordthings)) {
      for (const kv of data.passwordthings) {
        addKeyValueRow(passwordsContainer, "password", kv);
      }
    }
    // Load descdetails if present
    if (data.descdetails && Array.isArray(data.descdetails)) {
      const ed = subtableDescEditors.get(card[0]);
      if (ed) ed.setData(data.descdetails.join("<br>"));
    }
  }

  function addKeyValueRow(container, type, kv = {}) {
    // kv is object like {key: val}
    // We'll handle dynamic keys — show key and value inputs for each pair
    const keys = Object.keys(kv);
    // if empty, add empty row with two inputs: key and value
    const row = $(
      `<div class="d-flex gap-2 mb-1 align-items-center"></div>`
    );

    if (keys.length === 0) {
      // empty key-value row
      row.append(
        `<input type="text" class="form-control form-control-sm keyInput" placeholder="Key" />`
      );
      row.append(
        `<input type="text" class="form-control form-control-sm valueInput" placeholder="Value" />`
      );
    } else {
      // For each key-value pair, add inputs
      keys.forEach((k) => {
        const v = kv[k];
        row.append(
          `<input type="text" class="form-control form-control-sm keyInput" placeholder="Key" value="${escapeHtml(
            k
          )}" />`
        );
        row.append(
          `<input type="text" class="form-control form-control-sm valueInput" placeholder="Value" value="${escapeHtml(
            v
          )}" />`
        );
      });
    }
    row.append(
      `<button type="button" class="btn btn-danger btn-sm deleteKVBtn">&times;</button>`
    );
    container.append(row);

    row.find(".deleteKVBtn").click(() => row.remove());
  }

  function destroySubtableEditors(cardEl) {
    const ed = subtableDescEditors.get(cardEl);
    if (ed) ed.destroy();
    subtableDescEditors.delete(cardEl);
  }

  // --------------------
  // ADDITIONAL THINGS
  // --------------------
  const additionalContainerTableBody = $("#additionalContainerTableBody");

  function addAdditionalContainerRow(
    data = { header: "", description: "" }
  ) {
    const tr = $(`
  <tr>
    <td><input type="text" class="form-control form-control-sm additionalHeaderInput" value="${escapeHtml(
      data.header
    )}" /></td>
    <td><textarea class="form-control additionalDescTextarea">${escapeHtml(
      data.description
    )}</textarea></td>
    <td><button type="button" class="btn btn-danger btn-sm deleteAdditionalRowBtn">&times;</button></td>
  </tr>
`);
    additionalContainerTableBody.append(tr);

    // Initialize CKEditor for description textarea
    ClassicEditor.create(tr.find(".additionalDescTextarea")[0])
      .then((editor) => additionalDescEditors.set(tr[0], editor))
      .catch(console.error);

    // Delete button handler
    tr.find(".deleteAdditionalRowBtn").on("click", () => {
      const editor = additionalDescEditors.get(tr[0]);
      if (editor) editor.destroy();
      additionalDescEditors.delete(tr[0]);
      tr.remove();
    });
  }

  // --------------------
  // READ VAULT JSON FROM UI
  // --------------------
  function readVaultJSON() {
    const vault = {
      secretKeys: [],
      walletContainerContainer: [],
      additionalContainer: [],
    };

    // Secret Keys
    secretKeysContainer.children(".secretKeyCard").each(function () {
      const card = $(this);
      const name = card.find(".secretName").val().trim();
      const code = card.find(".secretCode").val().trim();
      const editors = secretKeyEditors.get(this) || {};
      const secretMessage = editors.secretMessage
        ? editors.secretMessage.getData()
        : "";
      const additionalInfo = editors.additionalInfo
        ? editors.additionalInfo.getData()
        : "";
      if (
        name !== "" ||
        code !== "" ||
        secretMessage !== "" ||
        additionalInfo !== ""
      ) {
        vault.secretKeys.push({
          Name: name,
          SecretCode: code,
          SecretMessage: secretMessage,
          "Additional Info": additionalInfo,
        });
      }
    });

    // Wallet Container
    walletContainerContainerContainer
      .children(".walletContainerContainerCard")
      .each(function () {
        const card = $(this);
        const walletContainer = card
          .find(".walletContainerEmail")
          .val()
          .trim();
        const descEditor = walletContainerDescEditors.get(this);
        const desc = descEditor ? descEditor.getData() : "";

        const subtables = [];
        card.find(".subtableCard").each(function () {
          const sub = $(this);
          const website = sub.find(".websiteInput").val().trim();
          const websiteurl = sub.find(".websiteUrlInput").val().trim();

          // Usernames key-value pairs
          const usernamenamethings = [];
          sub.find(".usernamesContainer > div").each(function () {
            const row = $(this);
            const key = row.find(".keyInput").val().trim();
            const value = row.find(".valueInput").val().trim();
            if (key !== "" || value !== "") {
              const obj = {};
              obj[key] = value;
              usernamenamethings.push(obj);
            }
          });

          // Passwords key-value pairs
          const passwordthings = [];
          sub.find(".passwordsContainer > div").each(function () {
            const row = $(this);
            const key = row.find(".keyInput").val().trim();
            const value = row.find(".valueInput").val().trim();
            if (key !== "" || value !== "") {
              const obj = {};
              obj[key] = value;
              passwordthings.push(obj);
            }
          });

          // Description details from editor
          const descEditor = subtableDescEditors.get(this);
          let descdetails = [];
          if (descEditor) {
            const data = descEditor.getData();
            // Split on <br> or new lines to array
            descdetails = data
              .split(/<br\s*\/?>|\n/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          }

          subtables.push({
            website,
            websiteurl,
            usernamenamethings,
            passwordthings,
            descdetails,
          });
        });

        vault.walletContainerContainer.push({
          Wallet: walletContainer,
          Desc: desc,
          Subtable: subtables,
        });
      });

    // Additional Container
    additionalContainerTableBody.children("tr").each(function () {
      const tr = $(this);
      const header = tr.find(".additionalHeaderInput").val().trim();
      const editor = additionalDescEditors.get(this);
      const description = editor ? editor.getData() : "";
      if (header !== "" || description !== "") {
        vault.additionalContainer.push({
          Header: header,
          Description: description,
        });
      }
    });

    return vault;
  }

  // --------------------
  // LOAD VAULT JSON INTO UI
  // --------------------
  function loadVaultJSON(vault) {
    // Clear existing data and editors first
    secretKeyEditors.forEach((eds, el) => {
      if (eds.secretMessage) eds.secretMessage.destroy();
      if (eds.additionalInfo) eds.additionalInfo.destroy();
    });
    secretKeyEditors.clear();
    walletContainerDescEditors.forEach((ed) => ed.destroy());
    walletContainerDescEditors.clear();
    subtableDescEditors.forEach((ed) => ed.destroy());
    subtableDescEditors.clear();
    additionalDescEditors.forEach((ed) => ed.destroy());
    additionalDescEditors.clear();

    secretKeysContainer.empty();
    walletContainerContainerContainer.empty();
    additionalContainerTableBody.empty();

    // Load Secret Keys
    if (Array.isArray(vault.secretKeys)) {
      for (const sk of vault.secretKeys) {
        addSecretKey(sk);
      }
    } else {
      addSecretKey();
    }

    // Load Wallet Container
    if (Array.isArray(vault.walletContainerContainer)) {
      for (const gt of vault.walletContainerContainer) {
        addWalletContainer(gt);
      }
    } else {
      addWalletContainer();
    }

    // Load Additional Container
    if (Array.isArray(vault.additionalContainer)) {
      for (const at of vault.additionalContainer) {
        addAdditionalContainerRow({
          header: at.Header || "",
          description: at.Description || "",
        });
      }
    } else {
      addAdditionalContainerRow();
    }
  }

  // --------------------
  // EXPORT VAULT JSON
  // --------------------
  function exportVaultJSON() {
    const vault = readVaultJSON();
    const json = JSON.stringify(vault, null, 2);
    $("#exportTextarea").val(json);
    return json;
  }

  // --------------------
  // RENDER VIEW VAULT TABLES
  // --------------------
  function renderVaultView(vault) {
    const container = $("#vaultViewContainer");
    container.empty();

    // SECRET KEYS TABLE
    if (vault.secretKeys && vault.secretKeys.length > 0) {
      let html = `<h4>Secret Keys</h4><table class="table table-striped table-bordered"><thead><tr><th>Name</th><th>Secret Code</th><th>Secret Message</th><th>Additional Info</th></tr></thead><tbody>`;
      vault.secretKeys.forEach((sk) => {
        html += `<tr>
      <td>${escapeHtml(sk.Name)}</td>
      <td>${escapeHtml(sk.SecretCode)}</td>
      <td>${sk.SecretMessage || ""}</td>
      <td>${sk["Additional Info"] || ""}</td>
    </tr>`;
      });
      html += `</tbody></table>`;
      container.append(html);
    } else {
      container.append("<p><em>No Secret Keys found.</em></p>");
    }

    // GMAIL THINGS TABLES
    if (
      vault.walletContainerContainer &&
      vault.walletContainerContainer.length > 0
    ) {
      vault.walletContainerContainer.forEach((gt, i) => {
        let html = "<fieldset class='walletContainerthingcontainer' >";
        html += `<legend>Wallet Container #${i + 1}</legend>`;
        html += `<p><strong>Wallet:</strong> ${escapeHtml(
          gt.Wallet
        )}</p>`;
        html += `<p><strong>Description:</strong> ${gt.Desc || ""}</p>`;

        if (gt.Subtable && gt.Subtable.length > 0) {
          gt.Subtable.forEach((sub, si) => {
            html += `<div class="border p-2 mb-3"><h5>Subtable #${
              si + 1
            }</h5>`;
            if (sub.website) {
              html += `<p><strong>Website:</strong> <a href="${escapeHtml(sub.websiteurl)}" target="_blank">${escapeHtml(sub.website)}</a></p>`;
            } else {
              // If no website text, just show the URL or empty text (you can adjust this)
              html += `<p><strong>Website:</strong> ${escapeHtml(sub.website)}</p>`;
            }
            
            if (
              sub.usernamenamethings &&
              sub.usernamenamethings.length > 0
            ) {
              html += `<h6>Usernames</h6><table class="table table-sm table-bordered"><tbody>`;
              sub.usernamenamethings.forEach((kv) => {
                for (const key in kv) {
                  html += `<tr><td>${escapeHtml(
                    key
                  )}</td><td>${escapeHtml(kv[key])}</td></tr>`;
                }
              });
              html += `</tbody></table>`;
            }

            if (sub.passwordthings && sub.passwordthings.length > 0) {
              html += `<h6>Passwords</h6><table class="table table-sm table-bordered"><tbody>`;
              sub.passwordthings.forEach((kv) => {
                for (const key in kv) {
                  html += `<tr><td>${escapeHtml(
                    key
                  )}</td><td>${escapeHtml(kv[key])}</td></tr>`;
                }
              });
              html += `</tbody></table>`;
            }

            if (sub.descdetails && sub.descdetails.length > 0) {
              html += `<h6>Description Details</h6><ul>`;
              sub.descdetails.forEach((line) => {
                html += `<li>${line}</li>`;
              });
              html += `</ul>`;
            }

            html += `</div>`;
          });
        } else {
          html += `<p><em>No Subtables found.</em></p>`;
        }
        html += `</fieldset>`;
        container.append(html);
      });
    } else {
      container.append("<p><em>No Wallet Container found.</em></p>");
    }

    // ADDITIONAL THINGS TABLE
    if (
      vault.additionalContainer &&
      vault.additionalContainer.length > 0
    ) {
      let html = `<h4>Additional Container</h4><table class="table table-striped table-bordered"><thead><tr><th>Header</th><th>Description</th></tr></thead><tbody>`;
      vault.additionalContainer.forEach((at) => {
        html += `<tr>
      <td>${escapeHtml(at.Header)}</td>
      <td>${at.Description || ""}</td>
    </tr>`;
      });
      html += `</tbody></table>`;
      container.append(html);
    } else {
      container.append("<p><em>No Additional Container found.</em></p>");
    }
  }

  // --------------------
  // EVENTS & INIT
  // --------------------
  $("#addSecretKeyBtn").click(() => addSecretKey());
  $("#addWalletContainerBtn").click(() => addWalletContainer());
  $("#addAdditionalContainerBtn").click(() =>
    addAdditionalContainerRow()
  );

  $("#exportBtn").click(() => exportVaultJSON());

  $("#importBtn").click(() => {
    try {
      const json = $("#importTextarea").val();
      const vault = JSON.parse(json);
      loadVaultJSON(vault);
      alert("Vault imported successfully.");
    } catch (e) {
      alert("Invalid JSON: " + e.message);
    }
  });

  // File import support
  $("#importFile").on("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const vault = JSON.parse(e.target.result);
        loadVaultJSON(vault);
        alert("Vault JSON file imported successfully.");
        $("#importFile").val("");
      } catch (ex) {
        alert("Failed to parse JSON file: " + ex.message);
      }
    };
    reader.readAsText(file);
  });

  $("#viewVaultBtn").click(() => {
    const vault = readVaultJSON();
    renderVaultView(vault);
    // Scroll to view
    $("html, body").animate(
      { scrollTop: $("#vaultViewContainer").offset().top },
      500
    );
  });

  // Initial load empty rows
  addSecretKey();
  addWalletContainer();
  addAdditionalContainerRow();
});
