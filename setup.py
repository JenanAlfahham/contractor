from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in contractor/__init__.py
from contractor import __version__ as version

setup(
	name="contractor",
	version=version,
	description="Contractor App",
	author="Jenan Alfahham",
	author_email="jenan_fh95@hotmail.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
