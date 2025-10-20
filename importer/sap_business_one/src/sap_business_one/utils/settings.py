from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class SapCredentials(BaseModel):
    """
    Represents authentication credentials for SAP Business One.

    :ivar company_db: The company database name.
    :type company_db: str
    :ivar username: The username for authentication.
    :type username: str
    :ivar password: The password for authentication.
    :type password: str
    """

    company_db: str = "21682_DEUSCHLE_T03"
    username: str = "CLOUDIAX\\c18626.13"
    password: str = "84$fs1JN7zd49kJ"


class SapBusinessOneSettings(BaseModel):
    """
    Represents the settings required to configure and connect to SAP Business One.

    This class defines the attributes needed to store connection details and
    credentials for SAP Business One. It ensures proper initialization and
    validation of these settings, which are critical for establishing successful
    communication with the SAP Business One system.

    :ivar url: The base URL of the SAP Business One service.
    :type url: str
    :ivar credentials: The authentication credentials needed for SAP Business One.
    :type credentials: SapCredentials
    """

    url: str = "https://htpc21682p02.cloudiax.com:50000/b1s/v2"
    credentials: SapCredentials = SapCredentials()


class Settings(BaseSettings):
    """
    Represents the settings configuration for the application.

    This class is used to manage application settings by combining configurations
    for SAP Business One and MCP (Managed Control Plane). It provides a structured
    way to interact with and manage these settings, encapsulating related
    sub-configurations. The `model_config` is used to define global behaviors for
    environment variable parsing.

    :ivar sap: Configuration settings for SAP Business One.
    :type sap: SapBusinessOneSettings
    :ivar mcp: Configuration settings for MCP (Managed Control Plane).
    :type mcp: McpSettings
    """
    PORT: int = 8000
    # Database settings
    DATABASE_URL: str = "postgresql://pm_user:pm_password@127.0.0.1:5433/project_management"
    DEBUG: bool = True
    sap: SapBusinessOneSettings = SapBusinessOneSettings()
    model_config = SettingsConfigDict(
        env_nested_delimiter="__",
        env_file=".env",
        env_file_encoding="utf-8"
    )


def get_settings():
    """
    Retrieves the application settings.

    This function is responsible for returning an instance of the `Settings` class,
    which contains configuration values required for the application.

    :return: An instance of the `Settings` class containing application configuration values.
    :rtype: Settings
    """
    return Settings()
