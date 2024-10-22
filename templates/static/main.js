"use strict";

class FormHelper {
  constructor(nameField, appNameLabel, hostField, appHostLabel, iconLabel) {
    this.nameField = nameField;
    this.appNameLabel = appNameLabel;
    this.hostField = hostField;
    this.appHostLabel = appHostLabel;
    this.iconLabel = iconLabel;
  }

  clearErrors() {
    if (this.nameField.classList.contains("error")) {
      this.nameField.classList.remove("error");
      this.appNameLabel.classList.remove("error");
      this.appNameLabel.innerText = "Application Name";
    }

    if (this.hostField.classList.contains("error")) {
      this.hostField.classList.remove("error");
      this.appHostLabel.classList.remove("error");
      this.appHostLabel.innerText = "IP-Address:Port";
    }

    if (this.iconLabel.classList.contains("error")) {
      this.iconLabel.classList.remove("error");
      this.iconLabel.innerText = "Application Icon";
    }
  }

  applyErrors(affectedProps, errorMsgs) {
    affectedProps.forEach((prop) => {
      if (prop === "app.name" && !this.nameField.classList.contains("error")) {
        this.nameField.classList.toggle("error");
        this.appNameLabel.classList.toggle("error");
        this.appNameLabel.innerText =
          errorMsgs != null ? errorMsgs[0] : "This name already exists!";
      }

      if (prop === "app.host" && !this.hostField.classList.contains("error")) {
        this.hostField.classList.toggle("error");
        this.appHostLabel.classList.toggle("error");
        this.appHostLabel.innerText =
          errorMsgs != null ? errorMsgs[1] : "This host already exists!";
      }

      if (prop == "app.icon" && !this.iconLabel.classList.contains("error")) {
        this.iconLabel.classList.toggle("error");
        this.iconLabel.innerText = "An icon is missing";
      }
    });
  }

  clearFields() {
    this.hostField.value = "";
    this.nameField.value = "";
  }
}

class AppAPI {
  removeFromFrontend() {
    const updateAppsSocket = new WebSocket(
      `ws://${window.location.host}/ws/update_applications/`
    );
    updateAppsSocket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type == "delete_app") {
        const appName = message.app_name;
        const appElement = document.getElementById(`${appName}-item`);
        if (appElement) appElement.remove();
      }
    };
  }

  async sendDeleteRequest(name) {
    try {
      var nameAsJson = JSON.stringify({ app_name: name });
      const response = await fetch("/api/delete_application", {
        method: "DELETE",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
        body: nameAsJson,
      });

      if (!response.ok) {
        alert(`Something went wrong. Error:${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getApplication(appName) {
    try {
      const response = await fetch(
        `/api/get_application?application=${encodeURIComponent(appName)}`,
        {
          method: "GET",
          headers: {
            "X-CSRFToken": getCSRFToken(),
          },
        }
      );

      if (response.ok) {
        return response.json();
      } else {
        console.error("Failed to fetch:", response.status, response.statusText);
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  async sendEditRequest(appForm) {
    console.log(appForm);
    try {
      let response = await fetch("/api/edit_application", {
        method: "POST",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
        body: appForm,
      });
      return response.json();
    } catch (error) {
      console.error(error);
    }
  }
}

function toggleSettingsMenu(button) {
  const menu = document.getElementById("settings-menu");
  menu.classList.toggle("show");
  button.classList.toggle("change");
}

const socket = new WebSocket(`ws://${window.location.host}/ws/system-info/`);

const systemInfoElements = {
  cpu_temp: document.getElementById("cpu-temp"),
  cpu_usage: document.getElementById("cpu-usage"),
  physical_cores: document.getElementById("physical-cores"),
  memory_usage: document.getElementById("memory-usage"),
  disk_usage: document.getElementById("disk-usage"),
  uptime: document.getElementById("uptime"),
};

const updateSystemInfo = (data) => {
  const cpu = data["cpu"];
  const disk = data["disk"];

  if (systemInfoElements.cpu_usage && cpu) {
    systemInfoElements.cpu_usage.innerText = `CPU Usage: ${cpu["usage"]}%`;
  }
  if (systemInfoElements.cpu_temp && cpu) {
    systemInfoElements.cpu_temp.innerText = `CPU Temperature: ${cpu["temp"]}°C`;
  }
  if (systemInfoElements.physical_cores && cpu) {
    systemInfoElements.physical_cores.innerText = `CPU cores: ${cpu["physical_cores"]}`;
  }
  if (systemInfoElements.memory_usage && disk) {
    systemInfoElements.memory_usage.innerText = `RAM: ${disk["used_mem"]}GB / ${disk["total_mem"]}GB\t${disk["mem_percent"]}%`;
  }
  if (systemInfoElements.disk_usage && disk) {
    systemInfoElements.disk_usage.innerText = `Disk Usage: ${disk["used_disk"]}GB / ${disk["total_disk"]}GB\t${disk["disk_percent"]}% (free: ${disk["free_disk"]}GB)`;
  }
  if (systemInfoElements.uptime && data["uptime"]) {
    systemInfoElements.uptime.innerText = `Up for ${data["uptime"]}h`;
  }
};

socket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  updateSystemInfo(data);
};

socket.onopen = () => {
  console.log("WebSocket is open now.");
};

socket.onclose = () => {
  console.log("WebSocket is closed now.");
};

function getCSRFToken() {
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  return csrfToken;
}

function addNewApplicationToDOM(html) {
  const appSection = document.querySelector(".application-section");
  let appSectionUl = appSection.querySelector("ul");

  if (!appSectionUl) {
    const placeholder = appSection.querySelector("p");
    if (placeholder) {
      placeholder.remove();
    }
    appSectionUl = document.createElement("ul");
    appSection.appendChild(appSectionUl);
  }
  appSectionUl.innerHTML += html;
}

async function uploadApplicationProps(event) {
  event.preventDefault();
  const nameField = document.getElementById("application_name");
  const appNameLabel = document.getElementById("app-name-label");
  const hostField = document.getElementById("application_host");
  const appHostLabel = document.getElementById("app-host-label");
  const iconLabel = document.getElementById("app-icon-label");

  let formData = new FormData();
  const applicationProps = document.getElementsByClassName("application-form");
  const checkBoxData = document.getElementsByClassName("checkbox");
  const csrfToken = getCSRFToken();

  for (let prop of applicationProps) formData.append(prop.id, prop.value);
  for (let cb of checkBoxData) formData.append(cb.id, cb.checked);
  formData.append(
    "application_icon",
    document.getElementById("application_icon").files[0]
  );

  try {
    const response = await fetch("/upload/", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
      },
      body: formData,
    });
    const data = await response.json();

    const formHelper = new FormHelper(
      nameField,
      appNameLabel,
      hostField,
      appHostLabel,
      iconLabel
    );

    validateJsonResponse(data, formHelper);
  } catch (error) {
    console.log(error);
  }
}

function validateJsonResponse(data, formHelper) {
  switch (data.status) {
    case "success":
      addNewApplicationToDOM(data.html);
      document.getElementById("new-application-container").style.display = "none";
      formHelper.clearErrors();
      break;
    case "ApplicationAlreadyExists":
      formHelper.clearErrors();
      formHelper.applyErrors(data["affected_properties"], null);
      break;
    case "InvalidIPv4AddressError":
      formHelper.clearErrors();
      formHelper.applyErrors(data["affected_properties"], [null, data["cause"]]);
      break;
    case "IconMissing":
      formHelper.clearErrors();
      formHelper.applyErrors(data["affected_properties"], null);
      break;
    case "EmptyField":
      formHelper.clearErrors();
      formHelper.applyErrors(data["affected_properties"], ["This field can't be empty!", "This field can't be empty!"]);
      break;
  }
}

function toggleApplicationWindow() {
  const nameField = document.getElementById("application_name");
  const appNameLabel = document.getElementById("app-name-label");
  const hostField = document.getElementById("application_host");
  const appHostLabel = document.getElementById("app-host-label");
  const iconLabel = document.getElementById("app-icon-label");

  let settingsLink = document.getElementById("new-application-container");
  if (settingsLink.style.display == "flex") {
    settingsLink.style.display = "none";
    document.getElementById("new-app-icon-preview").style.display = "none";
    const formHelper = new FormHelper(
      nameField,
      appNameLabel,
      hostField,
      appHostLabel,
      iconLabel
    );
    formHelper.clearErrors();
    formHelper.clearFields();
  } else {
    settingsLink.style.display = "flex";
  }
}

async function queryApplication(appName) {
  const response = await new AppAPI().getApplication(appName);
  if (response == null) {
    alert("This hasn't worked. Please check your Internet connection!");
    return;
  }
  document.getElementById("app-name-header").innerText = response["app_name"];
  document.getElementsByClassName("edit-application-form")[0].value =
    response["app_name"];
  document.getElementsByClassName("edit-application-form")[1].value =
    response["app_host"];
  document.getElementsByClassName("edited-checkbox")[0].checked =
    response["https"];
  document.getElementsByClassName("edited-checkbox")[1].checked =
    response["use_reverse_proxy"];

  await fetch(`${response["icon"]}`, {
    method: "GET",
    headers: {
      "X-CSRFToken": getCSRFToken(),
    },
  })
    .then((response) => response.blob())
    .then((blob) => {
      const imgURL = URL.createObjectURL(blob);
      document.getElementById("icon").src = imgURL;
    })
    .catch((error) =>
      console.error("There was a problem with the fetch operation:", error)
    );
}

function previewIcon(appName) {
  var preview;
  var icon;
  if (appName) {
    preview = document.getElementById("icon-preview");
    icon = document.getElementById(`edited_application_icon`).files[0];
  } else {
    preview = document.getElementById("new-app-icon-preview");
    icon = document.getElementById("application_icon").files[0];
  }
  preview.style.display = "initial";
  var reader = new FileReader();

  reader.onloadend = function () {
    preview.src = reader.result;
  };

  if (icon) reader.readAsDataURL(icon);
  else preview.src = "";
}

function elWithID(elName) {
  return document.getElementById(elName);
}

async function editApplication(appName) {
  let formData = new FormData();
  const editedTextField = document.getElementsByClassName(
    `edit-application-form`
  );
  const editedIcon = document.getElementById(`edited_application_icon`)
    .files[0];
  const editedCheckBoxes = document.getElementsByClassName(`edited-checkbox`);

  formData.append("original_name", appName);

  for (let txtField of editedTextField)
    formData.append(txtField.id, txtField.value);
  for (let checkBox of editedCheckBoxes)
    formData.append(checkBox.id, checkBox.checked);

  formData.append("edited_icon", editedIcon);
  let response = await new AppAPI().sendEditRequest(formData);
  const formHelper = new FormHelper(
    elWithID("edited_application_name"),
    elWithID("edit-app-name-label"),
    elWithID("edited_application_host"),
    elWithID("edit-app-host-label"),
    elWithID("edit-app-icon-label")
  );
  validateJsonResponse(response, formHelper);
}

function toggleEditAppWindow(item) {
  document.getElementById("icon-preview").style.display = "none";

  let itemName = String(item.id).split("-")[3];
  let editAppWindow = document.getElementsByClassName(`edit-application-container`)[0];
  if (editAppWindow.style.display == "flex") {
    editAppWindow.style.display = "none";
  } else {
    new FormHelper(
      elWithID("edited_application_name"),
      elWithID("edit-app-name-label"),
      elWithID("edited_application_host"),
      elWithID("edit-app-host-label"),
      elWithID("edit-app-icon-label")
    ).clearErrors();
    queryApplication(itemName);
    editAppWindow.style.display = "flex";
  }

  // Show new icon in preview
  document.getElementById("edited_application_icon").onchange = function () {
    previewIcon(itemName);
  };

  // Send new app properties to endpoint
  document.getElementById("edit-submit-btn").onclick = function () {
    editApplication(itemName);
  };
}

function changeTheme(button) {
  button.classList.toggle("light");
  if (document.body.classList.contains("light"))
    document.body.classList.remove("light");
  else document.body.classList.add("light");
}

document.addEventListener("DOMContentLoaded", () => {
  var appStatusSocket = new WebSocket(
    `ws://${window.location.host}/ws/application-status/`
  );
  appStatusSocket.onopen = () => {
    console.log("opened");
  };
  appStatusSocket.onopen = () => {
    // Send status message
    appStatusSocket.send(
      JSON.stringify({
        status: 1,
      })
    );
  };

  // Each application container gets a status light for the online status of their application
  appStatusSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    Array.from(
      document.getElementsByClassName("application-container")
    ).forEach((app, index) => {
      const statusDiv = document.createElement("div");
      statusDiv.className = "status-div";

      const onlineStatus =
        document.getElementsByClassName("online-status")[index];
      const httpsIcon = document.getElementsByClassName("https-icon")[index];

      httpsIcon.classList.toggle("httpsIconStyle");

      const online = data[app.id];
      if (online) onlineStatus.style.backgroundColor = "#39ff14";
      else onlineStatus.style.backgroundColor = "#ff2f14";

      if (httpsIcon) statusDiv.appendChild(httpsIcon);
      if (onlineStatus) statusDiv.appendChild(onlineStatus);

      // Add status info to app-icon-container
      app.appendChild(statusDiv);
    });
  };
});

function editAppSettings(button) {
  const indexStr = String(button.id);
  const index = indexStr.substring(indexStr.length - 1);
  const dropDown = document.getElementById(`dropdown-content-${index}`);
  if (dropDown.classList.contains("show")) dropDown.classList.remove("show");
  else dropDown.classList.toggle("show");
}

function deleteApplication(name) {
  const appAPI = new AppAPI();
  appAPI.sendDeleteRequest(name);
  appAPI.removeFromFrontend();
}